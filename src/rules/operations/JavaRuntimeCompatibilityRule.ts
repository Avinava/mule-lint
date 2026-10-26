import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { readMuleArtifact } from '../../core/MuleArtifact';

/**
 * Java versions each Mule runtime minor line supports.
 *
 * Source: https://docs.mulesoft.com/general/java-support (verified 2026-10-26).
 * Lines before 4.5 and after the last listed line are not in the table, so the
 * rule does not judge them.
 */
const JAVA_SUPPORT: Record<string, readonly string[]> = {
  '4.5': ['8', '11'],
  '4.6': ['8', '11', '17'],
  '4.7': ['8', '11', '17'],
  '4.8': ['8', '11', '17'],
  '4.9': ['17'],
  '4.10': ['17'],
  '4.11': ['17'],
  '4.12': ['17'],
  '4.13': ['17'],
};

/**
 * OPS-005: Java Version Supported by Minimum Runtime
 *
 * mule-artifact.json declares the Java versions the application supports
 * (`javaSpecificationVersions`) and the oldest runtime it runs on
 * (`minMuleVersion`). When none of the declared Java versions is supported by
 * that runtime line, the descriptor promises a runtime the application cannot
 * run on.
 */
export class JavaRuntimeCompatibilityRule extends ProjectRule {
  id = 'OPS-005';
  name = 'Java Version Supported by Minimum Runtime';
  description =
    'mule-artifact.json javaSpecificationVersions must include a Java version the minMuleVersion runtime supports';
  severity = 'warning' as const;
  category = 'operations' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const descriptor = readMuleArtifact(context.projectRoot);
    const declared = descriptor?.javaSpecificationVersions;
    const minMuleVersion = descriptor?.minMuleVersion;
    if (!descriptor || !declared || declared.length === 0 || !minMuleVersion) {
      return [];
    }

    const line = /^(\d+\.\d+)/.exec(minMuleVersion)?.[1];
    const supported = line ? JAVA_SUPPORT[line] : undefined;
    if (!supported) {
      return [];
    }

    const normalized = declared.map((version) => version.trim().replace(/^1\.(\d+)$/, '$1'));
    if (normalized.some((version) => supported.includes(version))) {
      return [];
    }

    const offset = descriptor.content.indexOf('"javaSpecificationVersions"');
    const lineNumber = offset < 0 ? 1 : descriptor.content.slice(0, offset).split('\n').length;

    return [
      this.createLocatedIssue(
        'mule-artifact.json',
        lineNumber,
        `javaSpecificationVersions [${declared.join(', ')}] includes no Java version supported by Mule ${line} (minMuleVersion ${minMuleVersion}), which supports Java ${supported.join(', ')}`,
        {
          projectRoot: context.projectRoot,
          suggestion: `Add a Java version Mule ${line} supports, or raise minMuleVersion to a runtime line that supports the declared versions.`,
        },
      ),
    ];
  }
}
