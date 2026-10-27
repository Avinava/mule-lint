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
 * Keys the Mule runtime, the deployment target, or the JVM supplies, so they
 * resolve without being defined in a properties file. Extend through the
 * `allowedKeys` and `allowedPrefixes` options.
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
  'http.port',
  'https.port',
  'http.private.port',
  'https.private.port',
  'file.encoding',
  'file.separator',
  'line.separator',
  'path.separator',
];
const RUNTIME_PREFIXES = ['anypoint.platform.', 'java.', 'user.', 'os.'];

const RESOURCES = 'src/main/resources/';

/** Keys of one loaded file, by the environment its file name pattern resolved to. */
interface PatternGroup {
  pattern: string;
  byEnvironment: Map<string, { file: string; keys: Set<string> }>;
}

/** Keys reachable through one resolution path: plain `${key}` or `${secure::key}`. */
interface KeySpace {
  always: Set<string>;
  groups: PatternGroup[];
}

interface LoadedConfiguration {
  plain: KeySpace;
  secure: KeySpace;
  /** Names used only as the secure-properties decryption key, supplied at startup */
  decryptionKeys: Set<string>;
  /** True when a loaded file name matches no file in src/main/resources */
  unlocatable: boolean;
}

const emptySpace = (): KeySpace => ({ always: new Set(), groups: [] });

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Turn a `file` attribute into a matcher; each `${...}` becomes one path segment. */
function filePattern(file: string): { regex: RegExp; placeholders: number } {
  const normalized = file.replace(/^classpath:/, '').replace(/^\.?\/+/, '');
  let source = '';
  let placeholders = 0;
  let cursor = 0;
  for (const match of normalized.matchAll(/\$\{[^}]+\}/g)) {
    source += escapeRegExp(normalized.slice(cursor, match.index)) + '([^/]+)';
    cursor = match.index + match[0].length;
    placeholders++;
  }
  source += escapeRegExp(normalized.slice(cursor));
  return { regex: new RegExp(`^${source}$`), placeholders };
}

function definedIn(space: KeySpace, key: string): boolean {
  return (
    space.always.has(key) ||
    space.groups.some((group) =>
      [...group.byEnvironment.values()].some((entry) => entry.keys.has(key)),
    )
  );
}

/**
 * Files of `${mule.env}`-style groups that lack a key another environment of
 * the same resolution path defines. A key defined in an unpatterned file is
 * available in every environment.
 */
function missingFiles(space: KeySpace, key: string): string[] {
  if (space.always.has(key)) return [];
  const environments = new Set(space.groups.flatMap((group) => [...group.byEnvironment.keys()]));
  const missing: string[] = [];
  for (const environment of [...environments].sort()) {
    const groups = space.groups.filter((group) => group.byEnvironment.has(environment));
    if (groups.some((group) => group.byEnvironment.get(environment)?.keys.has(key))) continue;
    missing.push(...groups.map((group) => group.byEnvironment.get(environment)?.file ?? ''));
  }
  return missing.filter(Boolean);
}

/**
 * CFG-004: Unresolved Property Placeholder
 *
 * A `${key}` or `${secure::key}` in Mule XML resolves only when a file loaded
 * by `<configuration-properties>` or `<secure-properties:config>` defines the
 * key, a `<global-property>` declares it, mule-artifact.json
 * `secureProperties` lists it as a platform secure property, or the runtime
 * supplies it. A missing key stops the application at startup. Reported once
 * per key:
 *
 * - a plain `${key}` that no loaded file, global property, or platform key
 *   defines, or that only a secure properties file defines;
 * - a key defined for some `${mule.env}` environments but not others;
 * - a `${secure::key}` that is defined in a scanned file but not one loaded by
 *   `<secure-properties:config>` (SEC-018 reports the other secure:: cases);
 * - a key referenced both as `${secure::key}` and as `${key}`.
 *
 * When a loaded file name cannot be matched to a file in src/main/resources,
 * the key set is unknown, so only the mixed-reference check runs. Messages
 * name keys and files, never values.
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
    const report = (reference: PropertyReference, message: string, suggestion: string) =>
      issues.push(
        this.createLocatedIssue(reference.relativePath, reference.line, message, {
          projectRoot: context.projectRoot,
          suggestion,
        }),
      );

    for (const [key, references] of byName) {
      if (isAllowed(key) || loaded.decryptionKeys.has(key)) continue;
      const platform = model.platformKeys.has(key);
      const firstPlain = references.plain[0];
      const firstSecure = references.secure[0];

      if (firstPlain && firstSecure && !platform) {
        report(
          firstPlain,
          `"${key}" is referenced as \${${key}} here and as \${secure::${key}} in ${firstSecure.relativePath}; each form resolves from a different source, so one of them fails`,
          `Use \${secure::${key}} everywhere for an encrypted value, or \${${key}} everywhere for a plain or platform secure property.`,
        );
        continue;
      }
      if (loaded.unlocatable) continue;

      if (firstPlain && !platform && !loaded.plain.always.has(key)) {
        this.judgePlain(key, firstPlain, loaded, report);
      }

      // Platform keys are SEC-017's; a missing module or definition is SEC-018's
      if (firstSecure && !platform && model.secureConfigPresent && scannedKeys.has(key)) {
        this.judgeSecure(key, firstSecure, loaded, report);
      }
    }

    return issues;
  }

  private judgePlain(
    key: string,
    reference: PropertyReference,
    loaded: LoadedConfiguration,
    report: (reference: PropertyReference, message: string, suggestion: string) => void,
  ): void {
    if (!definedIn(loaded.plain, key)) {
      if (definedIn(loaded.secure, key)) {
        report(
          reference,
          `"${key}" is defined only in a secure properties file, so \${${key}} does not resolve`,
          `Reference it as \${secure::${key}}.`,
        );
      } else {
        report(
          reference,
          `"${key}" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties`,
          'Define it in the loaded properties file for every environment, or, if the deployment supplies it, add it to this rule\'s "allowedKeys" option.',
        );
      }
      return;
    }
    const missing = missingFiles(loaded.plain, key);
    if (missing.length > 0) {
      report(
        reference,
        `"${key}" is missing from ${missing.join(', ')}, so it does not resolve in that environment`,
        'Define the key in every environment file loaded through the ${mule.env} pattern.',
      );
    }
  }

  private judgeSecure(
    key: string,
    reference: PropertyReference,
    loaded: LoadedConfiguration,
    report: (reference: PropertyReference, message: string, suggestion: string) => void,
  ): void {
    if (!definedIn(loaded.secure, key)) {
      report(
        reference,
        `secure::${key} is defined, but not in a file loaded by secure-properties:config, so it does not resolve`,
        `Move the encrypted value into the secure properties file, or reference \${${key}} if it is a plain property.`,
      );
      return;
    }
    const missing = missingFiles(loaded.secure, key);
    if (missing.length > 0) {
      report(
        reference,
        `secure::${key} is missing from ${missing.join(', ')}, so it does not resolve in that environment`,
        'Define the encrypted key in every environment file loaded through the ${mule.env} pattern.',
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
      unlocatable: false,
    };
    const model = getSecretModel(context.projectRoot, context.projectContext);
    for (const key of model.platformKeys) loaded.plain.always.add(key);

    const loads: {
      space: KeySpace;
      file: string;
      regex: RegExp;
      placeholders: number;
      literal: number;
    }[] = [];
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
        const { regex, placeholders } = filePattern(file);
        const literal = file.replace(/\$\{[^}]+\}/g, '').length;
        loads.push({ space, file, regex, placeholders, literal });
      }
    }

    // A file belongs to the most specific load matching it, so `${mule.env}.yaml`
    // does not claim `secure-dev.yaml` when `secure-${mule.env}.yaml` loads it.
    const resourcePaths = listConfigFiles(context.projectRoot, context.projectContext).map((file) =>
      file.slice(RESOURCES.length),
    );
    const claimed = new Map<
      (typeof loads)[number],
      { resource: string; env: string | undefined }[]
    >();
    for (const load of loads) {
      if (!resourcePaths.some((resource) => load.regex.test(resource))) loaded.unlocatable = true;
    }
    for (const resource of resourcePaths) {
      const matching = loads.filter((load) => load.regex.test(resource));
      const best = Math.min(...matching.map((load) => load.placeholders * 1000 - load.literal));
      for (const load of matching) {
        if (load.placeholders * 1000 - load.literal !== best) continue;
        const env = load.placeholders === 1 ? load.regex.exec(resource)?.[1] : undefined;
        claimed.set(load, [...(claimed.get(load) ?? []), { resource, env }]);
      }
    }

    for (const [load, resources] of claimed) {
      const group: PatternGroup = { pattern: load.file, byEnvironment: new Map() };
      for (const { resource, env } of resources) {
        const relativePath = `${RESOURCES}${resource}`;
        const keys = new Set(
          readDefinedKeys(context.projectRoot, relativePath).map((entry) => entry.key),
        );
        if (env) {
          group.byEnvironment.set(env, { file: relativePath, keys });
        } else {
          for (const key of keys) load.space.always.add(key);
        }
      }
      if (group.byEnvironment.size > 0) load.space.groups.push(group);
    }
    return loaded;
  }
}
