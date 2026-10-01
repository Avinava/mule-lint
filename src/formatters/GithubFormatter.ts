import { LintReport } from '../types/Report';
import { Severity } from '../types/Rule';

const COMMAND: Record<Severity, string> = { error: 'error', warning: 'warning', info: 'notice' };

/** Workflow-command escaping for the message part. */
function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Workflow-command escaping for property values (file, title). */
function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/**
 * Format a lint report as GitHub Actions workflow commands so issues show up
 * as annotations on the pull request diff.
 */
export function formatGithub(report: LintReport): string {
  const lines: string[] = [];
  for (const file of report.files) {
    if (!file.parsed) {
      lines.push(
        `::error file=${escapeProperty(file.relativePath)},title=PARSE-ERROR::${escapeData(file.parseError ?? 'Failed to parse file')}`,
      );
      continue;
    }
    for (const issue of file.issues) {
      const props = [`file=${escapeProperty(file.relativePath)}`];
      if (issue.line > 0) props.push(`line=${issue.line}`);
      if (issue.column !== undefined && issue.column > 0) props.push(`col=${issue.column}`);
      props.push(`title=${escapeProperty(issue.ruleId)}`);
      lines.push(`::${COMMAND[issue.severity]} ${props.join(',')}::${escapeData(issue.message)}`);
    }
  }
  return lines.join('\n');
}
