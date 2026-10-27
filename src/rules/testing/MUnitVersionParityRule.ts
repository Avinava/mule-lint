import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { readMuleArtifact } from '../../core/MuleArtifact';
import { readPom, type PomModel } from '../../core/ProjectSources';

/** First MUnit release whose compatibility table lists Java 17 (released 2024-01-07). */
const JAVA_17_MUNIT = '3.1.0';

/** POM properties that declare the Java version a project builds for. */
const JAVA_PROPERTIES = [
  'java.version',
  'maven.compiler.release',
  'maven.compiler.source',
  'maven.compiler.target',
];

interface MunitVersion {
  label: string;
  version: string;
  line: number;
}

/** Compare dotted numeric versions; qualifiers such as `-SNAPSHOT` are ignored. */
function compareVersions(left: string, right: string): number {
  const parts = (value: string) => value.split(/[.-]/).map((part) => parseInt(part, 10) || 0);
  const a = parts(left);
  const b = parts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

const isConcrete = (version: string | undefined): version is string =>
  version !== undefined && version !== '' && !version.includes('${');

/**
 * TEST-002: MUnit Version Parity
 *
 * The munit-maven-plugin, munit-runner, and munit-tools are released together
 * and must use the same version; a mismatch fails test execution or runs tests
 * against a different MUnit than the plugin expects. A project declaring Java
 * 17 (mule-artifact.json `javaSpecificationVersions` or a POM Java property)
 * needs MUnit 3.1.0 or later, the first release supporting Java 17.
 */
export class MUnitVersionParityRule extends ProjectRule {
  id = 'TEST-002';
  name = 'MUnit Version Parity';
  description =
    'munit-maven-plugin, munit-runner, and munit-tools must share one version, at least 3.1.0 on Java 17';
  severity = 'warning' as const;
  category = 'testing' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const pom = readPom(context.projectRoot, context.projectContext);
    if (!pom) {
      return [];
    }

    const versions = this.collectVersions(pom);
    if (versions.length === 0) {
      return [];
    }

    const issues: Issue[] = [];
    const reference = versions[0];
    if (reference) {
      for (const entry of versions.slice(1)) {
        if (compareVersions(entry.version, reference.version) === 0) continue;
        issues.push(
          this.createLocatedIssue(
            pom.relativePath,
            entry.line,
            `${entry.label} version ${entry.version} differs from ${reference.label} version ${reference.version}`,
            {
              projectRoot: context.projectRoot,
              suggestion:
                'Use one version for munit-maven-plugin, munit-runner, and munit-tools, for example through a shared munit.version property.',
            },
          ),
        );
      }
    }

    const javaSource = this.java17Source(context.projectRoot, pom);
    if (javaSource) {
      for (const entry of versions) {
        if (compareVersions(entry.version, JAVA_17_MUNIT) >= 0) continue;
        issues.push(
          this.createLocatedIssue(
            pom.relativePath,
            entry.line,
            `${entry.label} version ${entry.version} does not support Java 17, which ${javaSource} declares; MUnit ${JAVA_17_MUNIT} is the first release that does`,
            {
              projectRoot: context.projectRoot,
              suggestion: `Upgrade munit-maven-plugin, munit-runner, and munit-tools together to ${JAVA_17_MUNIT} or later.`,
            },
          ),
        );
      }
    }

    return issues;
  }

  /** The plugin first, so it is the reference the dependencies are compared with. */
  private collectVersions(pom: PomModel): MunitVersion[] {
    const versions: MunitVersion[] = [];
    const plugin = pom.plugins.find((entry) => entry.artifactId === 'munit-maven-plugin');
    const property = pom.properties.get('munit.version');

    if (plugin && isConcrete(plugin.version)) {
      versions.push({ label: 'munit-maven-plugin', version: plugin.version, line: plugin.line });
    } else if (property && isConcrete(property.value)) {
      versions.push({ label: 'munit.version', version: property.value, line: property.line });
    }

    for (const artifactId of ['munit-runner', 'munit-tools']) {
      const dependency = pom.dependencies.find((entry) => entry.artifactId === artifactId);
      if (dependency && isConcrete(dependency.version)) {
        versions.push({ label: artifactId, version: dependency.version, line: dependency.line });
      }
    }
    return versions;
  }

  /** Where Java 17 is declared, or undefined when it is not. */
  private java17Source(projectRoot: string, pom: PomModel): string | undefined {
    const declared = readMuleArtifact(projectRoot)?.javaSpecificationVersions ?? [];
    if (declared.some((version) => version.trim() === '17')) {
      return 'mule-artifact.json';
    }
    const property = JAVA_PROPERTIES.find((name) => pom.properties.get(name)?.value === '17');
    return property ? `pom.xml ${property}` : undefined;
  }
}
