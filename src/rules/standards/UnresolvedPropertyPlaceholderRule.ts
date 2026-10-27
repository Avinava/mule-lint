import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import {
  collectReferences,
  getSecretModel,
  listConfigFiles,
  readDefinedKeys,
  type PropertyReference,
} from '../../core/SecretModel';
import { allElements, readMuleSources, type MuleSource } from '../../core/ProjectSources';

/**
 * Keys that resolve on every deployment target without a properties file:
 * Mule runtime and JVM system properties, plus the `mule.env` and `mule.key`
 * conventions passed at startup. Keys only some targets supply, such as the
 * `http.port` family CloudHub reserves, are not here; allow them per target
 * through the `allowedKeys` and `allowedPrefixes` options.
 */
const RUNTIME_KEYS = [
  'mule.env',
  'mule.key',
  'mule.home',
  'mule.base',
  'mule.clusterId',
  'mule.nodeId',
  'app.name',
  'app.home',
  'file.encoding',
  'file.separator',
  'line.separator',
  'path.separator',
];
const RUNTIME_PREFIXES = ['anypoint.platform.', 'java.', 'user.', 'os.'];

const RESOURCES = 'src/main/resources/';

/** One file of a patterned load, with the placeholder values its path bound. */
interface Variant {
  load: number;
  binding: Map<string, string>;
  file: string;
  keys: Set<string>;
}

/** Keys reachable through one resolution path: plain `${key}` or `${secure::key}`. */
interface KeySpace {
  /** Keys available in every environment: unpatterned files, global and platform keys */
  always: Set<string>;
  variants: Variant[];
  /** True when a load of this path names a file that is not in src/main/resources */
  unlocated: boolean;
}

interface LoadedConfiguration {
  plain: KeySpace;
  secure: KeySpace;
  /** Names used only as the secure-properties decryption key, supplied at startup */
  decryptionKeys: Set<string>;
}

interface Load {
  id: number;
  space: KeySpace;
  regex: RegExp;
  /** Placeholder names in capture-group order, such as `region`, `mule.env` */
  names: string[];
  literal: number;
}

const emptySpace = (): KeySpace => ({ always: new Set(), variants: [], unlocated: false });

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Turn a `file` attribute into a matcher; each `${...}` becomes one path segment. */
function filePattern(file: string): { regex: RegExp; names: string[] } {
  const normalized = file
    .replace(/\\/g, '/')
    .replace(/^classpath:/, '')
    .replace(/^\.?\/+/, '');
  let source = '';
  const names: string[] = [];
  let cursor = 0;
  for (const match of normalized.matchAll(/\$\{([^}]+)\}/g)) {
    source += escapeRegExp(normalized.slice(cursor, match.index)) + '([^/]+)';
    cursor = match.index + match[0].length;
    names.push((match[1] ?? '').trim());
  }
  source += escapeRegExp(normalized.slice(cursor));
  return { regex: new RegExp(`^${source}$`), names };
}

function definedIn(space: KeySpace, key: string): boolean {
  return space.always.has(key) || space.variants.some((variant) => variant.keys.has(key));
}

/** Two bindings can apply together when they agree on every shared placeholder. */
function compatible(left: Map<string, string>, right: Map<string, string>): boolean {
  for (const [name, value] of left) {
    const other = right.get(name);
    if (other !== undefined && other !== value) return false;
  }
  return true;
}

/**
 * Files of patterned loads that lack a key another binding of the same load
 * defines, when no compatible file of any load supplies it either. A key in an
 * unpatterned file is available for every binding.
 */
function missingFiles(space: KeySpace, key: string): string[] {
  if (space.always.has(key)) return [];
  const defining = new Set(
    space.variants.filter((variant) => variant.keys.has(key)).map((variant) => variant.load),
  );
  return space.variants
    .filter((variant) => defining.has(variant.load) && !variant.keys.has(key))
    .filter(
      (variant) =>
        !space.variants.some(
          (other) => other.keys.has(key) && compatible(variant.binding, other.binding),
        ),
    )
    .map((variant) => variant.file)
    .sort();
}

type Report = (reference: PropertyReference, message: string, suggestion: string) => void;

/**
 * CFG-004: Unresolved Property Placeholder
 *
 * A `${key}` or `${secure::key}` in Mule XML resolves only when a file loaded
 * by `<configuration-properties>` or `<secure-properties:config>` defines the
 * key, a `<global-property>` declares it, mule-artifact.json
 * `secureProperties` lists it as a platform secure property, or the runtime
 * supplies it. A missing key stops the application at startup. Reported once
 * per key and form:
 *
 * - a plain `${key}` that no loaded file, global property, or platform key
 *   defines, or that only a secure properties file defines;
 * - a key a patterned load, such as `config/${region}/${mule.env}.yaml`,
 *   defines for some placeholder values but not others;
 * - a `${secure::key}` that is defined in a scanned file but not one loaded by
 *   `<secure-properties:config>` (SEC-018 reports the other secure:: cases).
 *
 * A key read both as `${key}` and `${secure::key}` is judged on each side,
 * and only the side that does not resolve is reported. When a load of one
 * resolution path names a file that is not in the repository, keys that path
 * does not define are not judged, but keys its located files define are still
 * checked across environments. Messages name keys and files, never values.
 */
export class UnresolvedPropertyPlaceholderRule extends ProjectRule {
  id = 'CFG-004';
  name = 'Unresolved Property Placeholder';
  description =
    'Every ${key} in Mule XML must be defined by a loaded properties file, a global property, a platform secure property, or the runtime';
  severity = 'warning' as const;
  category = 'standards' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const sources = readMuleSources(context.projectRoot, context.projectContext);
    if (sources.length === 0) {
      return [];
    }

    const allowedKeys = new Set([
      ...RUNTIME_KEYS,
      ...this.getOption<string[]>(context, 'allowedKeys', []),
    ]);
    const allowedPrefixes = [
      ...RUNTIME_PREFIXES,
      ...this.getOption<string[]>(context, 'allowedPrefixes', []),
    ];
    const isAllowed = (key: string) =>
      allowedKeys.has(key) || allowedPrefixes.some((prefix) => key.startsWith(prefix));

    const model = getSecretModel(context.projectRoot, context.projectContext);
    const loaded = this.loadConfiguration(context, sources);
    const scannedKeys = new Set(model.keys.map((key) => key.key));

    const byName = new Map<string, { plain: PropertyReference[]; secure: PropertyReference[] }>();
    for (const source of sources) {
      for (const reference of collectReferences(source.content, source.relativePath)) {
        if (!/^[\w.-]+$/.test(reference.name)) continue; // nested, expression, or prefixed
        const entry = byName.get(reference.name) ?? { plain: [], secure: [] };
        (reference.secure ? entry.secure : entry.plain).push(reference);
        byName.set(reference.name, entry);
      }
    }

    const issues: Issue[] = [];
    const report: Report = (reference, message, suggestion) =>
      issues.push(
        this.createLocatedIssue(reference.relativePath, reference.line, message, {
          projectRoot: context.projectRoot,
          suggestion,
        }),
      );

    for (const [key, references] of byName) {
      if (isAllowed(key) || loaded.decryptionKeys.has(key)) continue;
      // Platform keys resolve plain; their secure:: misuse is SEC-017's
      if (model.platformKeys.has(key)) continue;
      const firstPlain = references.plain[0];
      const firstSecure = references.secure[0];

      if (firstPlain) {
        this.judgePlain(key, firstPlain, firstSecure !== undefined, loaded, report);
      }
      // A missing module or definition anywhere is SEC-018's
      if (firstSecure && model.secureConfigPresent && scannedKeys.has(key)) {
        this.judgeSecure(key, firstSecure, firstPlain !== undefined, loaded, report);
      }
    }

    return issues;
  }

  private judgePlain(
    key: string,
    reference: PropertyReference,
    alsoSecure: boolean,
    loaded: LoadedConfiguration,
    report: Report,
  ): void {
    if (!definedIn(loaded.plain, key)) {
      if (loaded.plain.unlocated) return;
      if (definedIn(loaded.secure, key)) {
        report(
          reference,
          alsoSecure
            ? `"${key}" is referenced both as \${${key}} and as \${secure::${key}}; \${${key}} does not resolve because only a secure properties file defines it`
            : `"${key}" is defined only in a secure properties file, so \${${key}} does not resolve`,
          `Reference it as \${secure::${key}}.`,
        );
      } else {
        report(
          reference,
          `"${key}" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties`,
          'Define it in the loaded properties file for every environment, or, if the deployment target supplies it, add it to this rule\'s "allowedKeys" option.',
        );
      }
      return;
    }
    const missing = missingFiles(loaded.plain, key);
    if (missing.length > 0) {
      report(
        reference,
        `"${key}" is missing from ${missing.join(', ')}, so it does not resolve in that environment`,
        'Define the key in every file the patterned configuration-properties load can select.',
      );
    }
  }

  private judgeSecure(
    key: string,
    reference: PropertyReference,
    alsoPlain: boolean,
    loaded: LoadedConfiguration,
    report: Report,
  ): void {
    if (!definedIn(loaded.secure, key)) {
      if (loaded.secure.unlocated) return;
      report(
        reference,
        alsoPlain
          ? `"${key}" is referenced both as \${${key}} and as \${secure::${key}}; \${secure::${key}} does not resolve because no file loaded by secure-properties:config defines it`
          : `secure::${key} is defined, but not in a file loaded by secure-properties:config, so it does not resolve`,
        `Move the encrypted value into the secure properties file, or reference \${${key}} if it is a plain property.`,
      );
      return;
    }
    const missing = missingFiles(loaded.secure, key);
    if (missing.length > 0) {
      report(
        reference,
        `secure::${key} is missing from ${missing.join(', ')}, so it does not resolve in that environment`,
        'Define the encrypted key in every file the patterned secure-properties load can select.',
      );
    }
  }

  /** The keys each resolution path can reach, from the loading elements in Mule XML. */
  private loadConfiguration(
    context: ValidationContext,
    sources: MuleSource[],
  ): LoadedConfiguration {
    const loaded: LoadedConfiguration = {
      plain: emptySpace(),
      secure: emptySpace(),
      decryptionKeys: new Set(),
    };
    const model = getSecretModel(context.projectRoot, context.projectContext);
    for (const key of model.platformKeys) loaded.plain.always.add(key);

    const loads: Load[] = [];
    for (const source of sources) {
      for (const element of allElements(source.document)) {
        const namespace = element.namespaceURI ?? '';
        let space: KeySpace | undefined;
        if (element.localName === 'global-property') {
          const name = element.getAttribute('name');
          if (name) loaded.plain.always.add(name);
          continue;
        } else if (element.localName === 'configuration-properties') {
          space = loaded.plain;
        } else if (element.localName === 'config' && namespace.includes('secure-properties')) {
          space = loaded.secure;
          for (const reference of collectReferences(
            element.getAttribute('key') ?? '',
            source.relativePath,
          )) {
            loaded.decryptionKeys.add(reference.name);
          }
        }
        const file = element.getAttribute('file');
        if (!space || !file) continue;
        const { regex, names } = filePattern(file);
        const literal = file.replace(/\$\{[^}]+\}/g, '').length;
        loads.push({ id: loads.length, space, regex, names, literal });
      }
    }

    // A file belongs to the most specific load matching it, so `${mule.env}.yaml`
    // does not claim `secure-dev.yaml` when `secure-${mule.env}.yaml` loads it.
    const resourcePaths = listConfigFiles(context.projectRoot, context.projectContext).map((file) =>
      file.slice(RESOURCES.length),
    );
    for (const load of loads) {
      if (!resourcePaths.some((resource) => load.regex.test(resource))) load.space.unlocated = true;
    }
    const specificity = (load: Load) => load.names.length * 1000 - load.literal;
    for (const resource of resourcePaths) {
      const matching = loads.filter((load) => load.regex.test(resource));
      if (matching.length === 0) continue;
      const best = Math.min(...matching.map(specificity));
      const relativePath = `${RESOURCES}${resource}`;
      const keys = new Set(
        readDefinedKeys(context.projectRoot, relativePath).map((entry) => entry.key),
      );
      for (const load of matching) {
        if (specificity(load) !== best) continue;
        if (load.names.length === 0) {
          for (const key of keys) load.space.always.add(key);
          continue;
        }
        const values = load.regex.exec(resource)?.slice(1) ?? [];
        const binding = new Map(load.names.map((name, index) => [name, values[index] ?? '']));
        load.space.variants.push({ load: load.id, binding, file: relativePath, keys });
      }
    }
    return loaded;
  }
}
