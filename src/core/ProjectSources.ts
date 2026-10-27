/**
 * Project files that several project rules read, parsed once per scan.
 *
 * Mule XML under src/main/mule and the Maven POM are read by the configuration
 * parity rules (CFG-004, PROJ-003, ERR-005, TEST-002). Results are cached
 * through the engine's project context, like the secret model, so a scan reads
 * each file once however many of those rules are enabled.
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from './GlobFiles';
import { parseXml } from './XmlParser';
import { getLineNumber } from './XPathHelper';
import type { ProjectContext } from '../types';

/** A parsed Mule configuration file. */
export interface MuleSource {
  relativePath: string;
  content: string;
  document: Document;
}

/** A `<dependency>` or `<plugin>` declared in pom.xml. */
export interface PomArtifact {
  groupId?: string | undefined;
  artifactId: string;
  /** Version as written, before property resolution */
  rawVersion?: string | undefined;
  /** Version with `${property}` references resolved from `<properties>` */
  version?: string | undefined;
  /** Maven scope as written; absent means `compile` */
  scope?: string | undefined;
  /**
   * Line of the element, or of the managing `<dependencyManagement>` /
   * `<pluginManagement>` entry when the version comes from there
   */
  line: number;
}

/** The parts of pom.xml the parity rules read. */
export interface PomModel {
  relativePath: 'pom.xml';
  /** `<properties>` entries with their lines */
  properties: Map<string, { value: string; line: number }>;
  dependencies: PomArtifact[];
  plugins: PomArtifact[];
  /** True when the POM declares a `<parent>`, which may contribute dependencies */
  hasParent: boolean;
}

const IGNORED = ['**/target/**', '**/node_modules/**', '**/exchange_modules/**'];

const muleCache = new WeakMap<ProjectContext, MuleSource[]>();
const pomCache = new WeakMap<ProjectContext, PomModel | null>();

/**
 * Parsed Mule XML files under src/main/mule. Files that fail to parse are
 * skipped; the per-file parse error is reported by the engine.
 */
export function readMuleSources(
  projectRoot: string,
  projectContext?: ProjectContext,
): MuleSource[] {
  const cached = projectContext ? muleCache.get(projectContext) : undefined;
  if (cached) {
    return cached;
  }

  const sources: MuleSource[] = [];
  const files = fg.sync(['src/main/mule/**/*.xml'], {
    cwd: projectRoot,
    onlyFiles: true,
    ignore: IGNORED,
  });
  for (const relativePath of files.sort()) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    } catch {
      continue;
    }
    const parsed = parseXml(content, relativePath);
    if (parsed.success && parsed.document) {
      sources.push({ relativePath, content, document: parsed.document });
    }
  }

  if (projectContext) {
    muleCache.set(projectContext, sources);
  }
  return sources;
}

/**
 * ArtifactIds of dependencies on the application classpath. `test`-scoped
 * dependencies exist only for MUnit, so they do not make a connector
 * available to src/main/mule.
 */
export function mainDependencyIds(pom: PomModel | undefined): Set<string> {
  return new Set(
    (pom?.dependencies ?? [])
      .filter((dependency) => dependency.scope !== 'test')
      .map((dependency) => dependency.artifactId),
  );
}

/** Every element in a document. */
export function allElements(document: Document): Element[] {
  return Array.from(document.getElementsByTagName('*'));
}

function childElements(parent: Element, localName: string): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === 1 && (node as Element).localName === localName,
  );
}

function childText(parent: Element, localName: string): string | undefined {
  const text = childElements(parent, localName)[0]?.textContent.trim();
  return text ? text : undefined;
}

/** Resolve `${name}` references from POM properties; unknown references stay as written. */
function resolveProperties(
  value: string | undefined,
  properties: Map<string, { value: string; line: number }>,
): string | undefined {
  if (value === undefined) return undefined;
  let resolved = value;
  // Bounded passes so a self-referencing property cannot loop
  for (let pass = 0; pass < 5 && resolved.includes('${'); pass++) {
    resolved = resolved.replace(
      /\$\{([^}]+)\}/g,
      (whole, name: string) => properties.get(name.trim())?.value ?? whole,
    );
  }
  return resolved;
}

function readArtifact(
  element: Element,
  properties: Map<string, { value: string; line: number }>,
): PomArtifact | undefined {
  const artifactId = childText(element, 'artifactId');
  if (!artifactId) return undefined;
  const rawVersion = childText(element, 'version');
  return {
    groupId: childText(element, 'groupId'),
    artifactId,
    rawVersion,
    version: resolveProperties(rawVersion, properties),
    scope: childText(element, 'scope'),
    line: getLineNumber(element),
  };
}

/** Fill a missing version from the matching managed entry, as Maven does. */
function applyManagedVersion(artifact: PomArtifact, managed: PomArtifact[]): PomArtifact {
  if (artifact.rawVersion !== undefined) return artifact;
  const entry = managed.find(
    (candidate) =>
      candidate.artifactId === artifact.artifactId &&
      (candidate.groupId === undefined ||
        artifact.groupId === undefined ||
        candidate.groupId === artifact.groupId),
  );
  if (!entry?.rawVersion) return artifact;
  return { ...artifact, rawVersion: entry.rawVersion, version: entry.version, line: entry.line };
}

/**
 * Read pom.xml. Returns undefined when it is missing or malformed.
 *
 * Only the project's own `<dependencies>` and `<build><plugins>` are listed;
 * `<dependencyManagement>` and `<pluginManagement>` add nothing to the
 * application, but supply the version of a listed artifact that omits one.
 */
export function readPom(
  projectRoot: string,
  projectContext?: ProjectContext,
): PomModel | undefined {
  if (projectContext && pomCache.has(projectContext)) {
    return pomCache.get(projectContext) ?? undefined;
  }

  let model: PomModel | undefined;
  try {
    const content = fs.readFileSync(path.join(projectRoot, 'pom.xml'), 'utf8');
    const parsed = parseXml(content, 'pom.xml');
    const project = parsed.success ? parsed.document?.documentElement : undefined;
    if (project) {
      const properties = new Map<string, { value: string; line: number }>();
      for (const block of childElements(project, 'properties')) {
        for (const node of Array.from(block.childNodes)) {
          if (node.nodeType !== 1) continue;
          const element = node as Element;
          properties.set(element.localName, {
            value: element.textContent.trim(),
            line: getLineNumber(element),
          });
        }
      }

      const artifacts = (parents: Element[], list: string, item: string): PomArtifact[] =>
        parents
          .flatMap((parent) => childElements(parent, list))
          .flatMap((block) => childElements(block, item))
          .map((element) => readArtifact(element, properties))
          .filter((artifact): artifact is PomArtifact => artifact !== undefined);

      const builds = childElements(project, 'build');
      const managedDependencies = artifacts(
        childElements(project, 'dependencyManagement'),
        'dependencies',
        'dependency',
      );
      const managedPlugins = artifacts(
        builds.flatMap((build) => childElements(build, 'pluginManagement')),
        'plugins',
        'plugin',
      );
      const dependencies = artifacts([project], 'dependencies', 'dependency').map((artifact) =>
        applyManagedVersion(artifact, managedDependencies),
      );
      const plugins = artifacts(builds, 'plugins', 'plugin').map((artifact) =>
        applyManagedVersion(artifact, managedPlugins),
      );

      model = {
        relativePath: 'pom.xml',
        properties,
        dependencies,
        plugins,
        hasParent: childElements(project, 'parent').length > 0,
      };
    }
  } catch {
    model = undefined;
  }

  if (projectContext) {
    pomCache.set(projectContext, model ?? null);
  }
  return model;
}
