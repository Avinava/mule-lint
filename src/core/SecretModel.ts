/**
 * How a project supplies its secrets, collected once per scan.
 *
 * Mule supports two secret models and both are valid:
 *
 * - Secure Configuration Properties: the value is encrypted as `![...]` in a
 *   secure properties file read by `<secure-properties:config>`, and the
 *   application references it as `${secure::key}`.
 * - Platform secure properties: the value is supplied at deployment (Runtime
 *   Manager properties), the key is listed in mule-artifact.json
 *   `secureProperties`, and the application references it as plain `${key}`.
 *
 * SEC-007, SEC-017, SEC-018, and SEC-019 read this model so they agree on which
 * reference belongs to which model. @sfdxy/mule-build applies the same
 * semantics in its MB-SEC-004, MB-SEC-006, and MB-SEC-007 findings.
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from './GlobFiles';
import { parseProperties } from './PropertiesParser';
import { isEncryptedValue } from './SensitiveKeys';
import { readMuleArtifact } from './MuleArtifact';
import type { ProjectContext } from '../types';

/** A key defined in a configuration file under src/main/resources. */
export interface DefinedKey {
  key: string;
  value: string;
  relativePath: string;
  line: number;
  encrypted: boolean;
}

/** A property reference in Mule XML, DataWeave, or a configuration value. */
export interface PropertyReference {
  name: string;
  /** True when the reference uses the `secure::` prefix */
  secure: boolean;
  relativePath: string;
  line: number;
}

export interface SecretModel {
  keys: DefinedKey[];
  references: PropertyReference[];
  /** Keys supplied by the platform: plain entries in mule-artifact.json secureProperties */
  platformKeys: Set<string>;
  /** True when Mule XML in the application configures `<secure-properties:config>` */
  secureConfigPresent: boolean;
  /** True when the POM depends on a mule-domain, which may configure secure properties */
  sharedDomain: boolean;
}

const MULE_SOURCES = ['src/main/mule/**/*.xml'];
const RESOURCE_SOURCES = ['**/*.dwl'];
const CONFIG_SOURCES = ['**/*.properties', '**/*.yaml', '**/*.yml'];
const IGNORED = ['**/target/**', '**/node_modules/**', '**/exchange_modules/**'];

// `${name}` and `${secure::name}`, and DataWeave `p('name')` / `Mule::p('secure::name')`.
const REFERENCE_PATTERNS = [/\$\{(secure::)?([^}]+)\}/g, /\bp\(\s*['"](secure::)?(.+?)['"]\s*\)/g];

const cache = new WeakMap<ProjectContext, SecretModel>();

/**
 * Remediation text naming both supported secret models.
 *
 * @param key - The property key the value should live under
 */
export function secretRemediation(key: string): string {
  return (
    `Either encrypt it as ![...] in a secure properties file and reference \${secure::${key}}, ` +
    `or supply it at deployment as a platform secure property: reference \${${key}} and list "${key}" in mule-artifact.json secureProperties.`
  );
}

/**
 * Platform-supplied keys from mule-artifact.json secureProperties.
 *
 * Entries named `secure::key` (or `secure\:\:key` as written by Studio's Text
 * View) mask module-backed values and are not platform-supplied.
 */
export function platformSecureKeys(entries: readonly string[] = []): Set<string> {
  return new Set(
    entries
      .map((entry) => entry.replace(/\\:/g, ':').trim())
      .filter((entry) => entry && !entry.startsWith('secure::')),
  );
}

const blank = (block: string): string => block.replace(/[^\n]/g, ' ');

/** Blank out XML comments and CDATA while keeping offsets and line numbers intact. */
function maskXmlNonMarkup(content: string): string {
  return content.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, blank);
}

/**
 * Blank out XML comments only. CDATA holds inline DataWeave and scripts whose
 * `${...}` placeholders and `p('...')` calls the runtime resolves, so their
 * references are real.
 */
function maskXmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, blank);
}

/** A project-relative path under src/main/resources, always with `/`, on every OS. */
function resourcePath(file: string): string {
  return path.posix.join('src/main/resources', file.split(path.sep).join('/'));
}

function lineAt(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Every property reference in a piece of content, with line numbers.
 *
 * @param lineOffset - Added to each line, for content that starts mid-file
 */
export function collectReferences(
  content: string,
  relativePath: string,
  lineOffset = 0,
): PropertyReference[] {
  const references: PropertyReference[] = [];
  const searchable = relativePath.endsWith('.xml') ? maskXmlComments(content) : content;
  for (const pattern of REFERENCE_PATTERNS) {
    for (const match of searchable.matchAll(pattern)) {
      const name = (match[2] ?? '').trim();
      if (name) {
        references.push({
          name,
          secure: Boolean(match[1]),
          relativePath,
          line: lineAt(content, match.index) + lineOffset,
        });
      }
    }
  }
  return references;
}

/** Whether Mule XML configures the Secure Configuration Properties module. */
export function hasSecurePropertiesConfig(content: string): boolean {
  return /<secure-properties:config\b/.test(maskXmlNonMarkup(content));
}

/**
 * Index the scalar keys of a YAML document with their lines.
 *
 * Covers the block-mapping style Mule configuration files use. Sequence items
 * are skipped and block scalars (`|`, `>`) are read as empty values, which is
 * enough to name keys, find references, and spot encrypted values.
 */
export function indexYamlKeys(content: string): { key: string; value: string; line: number }[] {
  const entries: { key: string; value: string; line: number }[] = [];
  const stack: { indent: number; key: string }[] = [];
  const lines = content.split(/\r\n|\r|\n/);
  let blockIndent = -1;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? '';
    const indent = raw.length - raw.trimStart().length;
    const text = raw.trim();

    if (blockIndent >= 0) {
      if (text === '' || indent > blockIndent) continue;
      blockIndent = -1;
    }
    if (text === '' || text.startsWith('#') || text === '---' || text.startsWith('- ')) {
      continue;
    }

    const match = /^("[^"]*"|'[^']*'|[^:#]+?)\s*:(?:\s+(.*))?$/.exec(text);
    if (!match) continue;

    const key = (match[1] ?? '').replace(/^["']|["']$/g, '');
    const value = (match[2] ?? '').replace(/\s+#.*$/, '').trim();

    while (stack.length > 0 && (stack.at(-1)?.indent ?? 0) >= indent) {
      stack.pop();
    }
    const fullKey = [...stack.map((entry) => entry.key), key].join('.');

    if (value === '') {
      stack.push({ indent, key });
      continue;
    }
    if (/^[|>][+-]?\d*$/.test(value)) {
      blockIndent = indent;
      entries.push({ key: fullKey, value: '', line: index + 1 });
      continue;
    }
    entries.push({ key: fullKey, value: value.replace(/^(["'])(.*)\1$/, '$2'), line: index + 1 });
  }

  return entries;
}

/** Whether the POM depends on a Mule domain project. */
function dependsOnSharedDomain(projectRoot: string): boolean {
  try {
    const pom = fs.readFileSync(path.join(projectRoot, 'pom.xml'), 'utf8');
    return [...pom.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)].some((block) =>
      /<classifier>\s*mule-domain\s*<\/classifier>/.test(block[1] ?? ''),
    );
  } catch {
    return false;
  }
}

function readText(absolutePath: string): string | undefined {
  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * Configuration files under src/main/resources, excluding API specifications,
 * whose keys are API definitions rather than application properties.
 */
export function listConfigFiles(projectRoot: string, projectContext?: ProjectContext): string[] {
  const resourcesPath = path.join(projectRoot, 'src/main/resources');
  if (!fs.existsSync(resourcesPath)) {
    return [];
  }
  const specs = new Set(projectContext?.apiSpecFiles ?? []);
  return fg
    .sync(CONFIG_SOURCES, { cwd: resourcesPath, onlyFiles: true, ignore: IGNORED })
    .map(resourcePath)
    .filter((relativePath) => !specs.has(relativePath) && !specs.has(path.normalize(relativePath)))
    .sort();
}

/** Keys defined in one configuration file. */
export function readDefinedKeys(projectRoot: string, relativePath: string): DefinedKey[] {
  const content = readText(path.join(projectRoot, relativePath));
  if (content === undefined) {
    return [];
  }
  const entries = relativePath.endsWith('.properties')
    ? parseProperties(content)
    : indexYamlKeys(content);
  return entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    relativePath,
    line: entry.line,
    encrypted: isEncryptedValue(entry.value),
  }));
}

/**
 * Build the project's secret model. The result is cached per scan through the
 * engine's project context, so the rules sharing it read the project once.
 */
export function getSecretModel(projectRoot: string, projectContext?: ProjectContext): SecretModel {
  const cached = projectContext ? cache.get(projectContext) : undefined;
  if (cached) {
    return cached;
  }

  const keys: DefinedKey[] = [];
  const references: PropertyReference[] = [];
  let secureConfigPresent = false;

  for (const relativePath of listConfigFiles(projectRoot, projectContext)) {
    for (const key of readDefinedKeys(projectRoot, relativePath)) {
      keys.push(key);
      references.push(...collectReferences(key.value, relativePath, key.line - 1));
    }
  }

  const muleFiles = fg.sync(MULE_SOURCES, { cwd: projectRoot, onlyFiles: true, ignore: IGNORED });
  for (const relativePath of muleFiles.sort()) {
    const content = readText(path.join(projectRoot, relativePath));
    if (content === undefined) continue;
    references.push(...collectReferences(content, relativePath));
    secureConfigPresent ||= hasSecurePropertiesConfig(content);
  }

  const resourcesPath = path.join(projectRoot, 'src/main/resources');
  if (fs.existsSync(resourcesPath)) {
    const scripts = fg.sync(RESOURCE_SOURCES, {
      cwd: resourcesPath,
      onlyFiles: true,
      ignore: IGNORED,
    });
    for (const file of scripts.sort()) {
      const relativePath = resourcePath(file);
      const content = readText(path.join(projectRoot, relativePath));
      if (content !== undefined) {
        references.push(...collectReferences(content, relativePath));
      }
    }
  }

  const model: SecretModel = {
    keys,
    references,
    platformKeys: platformSecureKeys(
      projectContext?.platformSecureProperties ??
        readMuleArtifact(projectRoot)?.secureProperties ??
        [],
    ),
    secureConfigPresent,
    sharedDomain: dependsOnSharedDomain(projectRoot),
  };

  if (projectContext) {
    cache.set(projectContext, model);
  }
  return model;
}
