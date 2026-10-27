import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import {
  collectReferences,
  getSecretModel,
  listConfigFiles,
  readDefinedKeys,
  type PropertyReference,
} from '../../core/SecretModel';
import {
  allElements,
  readMuleSources,
  readPom,
  type DeploymentTarget,
  type MuleSource,
} from '../../core/ProjectSources';

/**
 * Keys that resolve on every deployment target without a properties file:
 * Mule runtime and JVM system properties, plus the `mule.env` and `mule.key`
 * conventions passed at startup. The `http.port` family CloudHub reserves is
 * added only on a CloudHub target (see CLOUDHUB_RESERVED_KEYS); other keys a
 * target supplies go in the `allowedKeys` and `allowedPrefixes` options.
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

/**
 * Ports CloudHub and CloudHub 2.0 reserve and set for every application
 * (docs.mulesoft.com cloudhub-manage-props and ch2-manage-props, verified
 * 2026-10-27). Runtime Fabric and customer-hosted runtimes document no such
 * properties, so they count as supplied only on a CloudHub target.
 */
const CLOUDHUB_RESERVED_KEYS = new Set([
  'http.port',
  'https.port',
  'http.private.port',
  'https.private.port',
]);
const CLOUDHUB_TARGETS: ReadonlySet<DeploymentTarget> = new Set(['cloudhub', 'cloudhub2']);
const DEPLOYMENT_TARGETS: ReadonlySet<string> = new Set([
  'cloudhub',
  'cloudhub2',
  'rtf',
  'standalone',
]);

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
  /** Deployable placeholder combinations; undefined when there are too many to check */
  combinations?: Map<string, string>[] | undefined;
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

/** Most placeholder combinations evaluated per resolution path before the check is limited. */
const MAX_COMBINATIONS = 128;

type Combination = Map<string, string>;

/**
 * Every combination of placeholder values the patterned loads of a resolution
 * path can be deployed with: the cross product of the values each placeholder
 * takes in the located files. A combination for which some load has no file
 * is not deployable and is dropped. Returns `limited` instead when the cross
 * product exceeds {@link MAX_COMBINATIONS}.
 */
function enumerateCombinations(
  space: KeySpace,
): { combinations: Combination[] } | { limited: number } {
  const domains = new Map<string, Set<string>>();
  for (const variant of space.variants) {
    for (const [name, value] of variant.binding) {
      domains.set(name, (domains.get(name) ?? new Set()).add(value));
    }
  }
  const names = [...domains.keys()].sort();
  const count = names.reduce((product, name) => product * (domains.get(name)?.size ?? 1), 1);
  if (count > MAX_COMBINATIONS) return { limited: count };

  let combinations: Combination[] = [new Map<string, string>()];
  for (const name of names) {
    const values = [...(domains.get(name) ?? [])].sort();
    combinations = combinations.flatMap((combination) =>
      values.map((value) => new Map(combination).set(name, value)),
    );
  }
  const loads = new Set(space.variants.map((variant) => variant.load));
  return {
    combinations: combinations.filter((combination) =>
      [...loads].every((load) => selected(space, combination).some((v) => v.load === load)),
    ),
  };
}

/** The file each patterned load selects under a combination. */
function selected(space: KeySpace, combination: Combination): Variant[] {
  return space.variants.filter((variant) =>
    [...variant.binding].every(([name, value]) => combination.get(name) === value),
  );
}

const describeCombination = (combination: Combination): string =>
  [...combination].map(([name, value]) => `${name}=${value}`).join(', ');

/**
 * Combinations under which no selected file defines a key some file of the
 * path defines, reduced to the placeholders that matter: a placeholder is
 * dropped when every value of it fails the same way, so a key missing only
 * from `prod` files is reported for `mule.env=prod` alone. A key in an
 * unpatterned file resolves under every combination.
 */
function unresolvedCombinations(
  space: KeySpace,
  combinations: Combination[],
  key: string,
): { when: string[]; files: string[] } {
  if (space.always.has(key) || !space.variants.some((variant) => variant.keys.has(key))) {
    return { when: [], files: [] };
  }
  const failing = combinations.filter(
    (combination) => !selected(space, combination).some((variant) => variant.keys.has(key)),
  );
  if (failing.length === 0) return { when: [], files: [] };

  const failingIds = new Set(failing.map(describeCombination));
  const names = [...(failing[0]?.keys() ?? [])];
  const varying = names.filter((name) =>
    failing.some((combination) =>
      combinations.some(
        (other) =>
          other.get(name) !== combination.get(name) &&
          names.every((n) => n === name || other.get(n) === combination.get(n)) &&
          !failingIds.has(describeCombination(other)),
      ),
    ),
  );
  // When no single placeholder explains the failure, keep the full combination
  const relevant = varying.length > 0 ? varying : names;
  const reduce = (combination: Combination): Combination =>
    new Map([...combination].filter(([name]) => relevant.includes(name)));

  const when = [...new Set(failing.map((combination) => describeCombination(reduce(combination))))];
  const files = new Set<string>();
  for (const combination of failing) {
    for (const variant of selected(space, combination)) {
      if ([...variant.binding.keys()].some((name) => relevant.includes(name))) {
        files.add(variant.file);
      }
    }
  }
  return { when: when.sort(), files: [...files].sort() };
}

/** The unresolved combinations for a key, or undefined when it resolves or was not checked. */
function combinationGap(
  space: KeySpace,
  key: string,
): { when: string[]; files: string[] } | undefined {
  if (!space.combinations) return undefined;
  const gap = unresolvedCombinations(space, space.combinations, key);
  return gap.when.length > 0 ? gap : undefined;
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
 * checked across environments. The CloudHub reserved ports count as supplied
 * when every mule-maven-plugin deployment is CloudHub or CloudHub 2.0, or the
 * `deploymentTarget` option says so. Messages name keys and files, never values.
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
    if (this.suppliesCloudHubPorts(context)) {
      for (const key of CLOUDHUB_RESERVED_KEYS) allowedKeys.add(key);
    }
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
    for (const [space, element] of [
      [loaded.plain, 'configuration-properties'],
      [loaded.secure, 'secure-properties'],
    ] as const) {
      const enumerated = enumerateCombinations(space);
      if ('combinations' in enumerated) {
        space.combinations = enumerated.combinations;
      } else {
        issues.push(
          this.createProjectIssue(
            `Environment combinations were not checked: the patterned ${element} loads select ${enumerated.limited} combinations, more than the limit of ${MAX_COMBINATIONS}`,
            {
              severity: 'info',
              suggestion:
                'Keys are still checked for being defined somewhere. Split independent placeholders into fewer patterned files to have every combination checked.',
            },
          ),
        );
      }
    }
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

  /**
   * True when every deployment target is CloudHub or CloudHub 2.0, so the
   * reserved port keys are set by the platform. The `deploymentTarget` option
   * overrides what the mule-maven-plugin declares; with neither, the target
   * is unknown and the ports must be defined or allowed.
   */
  private suppliesCloudHubPorts(context: ValidationContext): boolean {
    const option = this.getOption<string>(context, 'deploymentTarget', '');
    const targets: ReadonlySet<DeploymentTarget> = DEPLOYMENT_TARGETS.has(option)
      ? new Set([option as DeploymentTarget])
      : (readPom(context.projectRoot, context.projectContext)?.deploymentTargets ?? new Set());
    return targets.size > 0 && [...targets].every((target) => CLOUDHUB_TARGETS.has(target));
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
      } else if (CLOUDHUB_RESERVED_KEYS.has(key)) {
        report(
          reference,
          `"${key}" is not defined in any loaded file; CloudHub and CloudHub 2.0 supply it, but no CloudHub deployment target is declared (mule-maven-plugin or the "deploymentTarget" option); on other targets define it, or add it to "allowedKeys" if the target supplies it`,
          'Define it in the loaded properties file, declare the CloudHub deployment in the mule-maven-plugin or set this rule\'s "deploymentTarget" option, or add it to "allowedKeys" for a target that supplies it.',
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
    const gap = combinationGap(loaded.plain, key);
    if (gap) {
      report(
        reference,
        `"${key}" is missing from ${gap.files.join(', ')}, so it does not resolve when ${gap.when.join(' or ')}`,
        'Define the key in every file the patterned configuration-properties loads can select.',
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
    const gap = combinationGap(loaded.secure, key);
    if (gap) {
      report(
        reference,
        `secure::${key} is missing from ${gap.files.join(', ')}, so it does not resolve when ${gap.when.join(' or ')}`,
        'Define the encrypted key in every file the patterned secure-properties loads can select.',
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
