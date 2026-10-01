import { LintReport } from '../types/Report';
import { Issue, Severity } from '../types/Rule';

const MAX_ROWS = 100;
const SEVERITY_LABEL: Record<Severity, string> = {
  error: '❌ error',
  warning: '⚠️ warning',
  info: 'ℹ️ info',
};
const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Escape characters that would break a Markdown table cell or render as markup. */
function cell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[`<>]/g, (c) => `\\${c}`)
    .replace(/\r?\n/g, ' ');
}

/**
 * Format a lint report as GitHub-flavored Markdown, suited to PR comments and
 * `$GITHUB_STEP_SUMMARY`.
 */
export function formatMarkdown(report: LintReport): string {
  const { summary } = report;
  const rows: { file: string; issue: Issue }[] = report.files.flatMap((file) =>
    file.issues.map((issue) => ({ file: file.relativePath, issue })),
  );
  rows.sort(
    (a, b) =>
      SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] ||
      a.file.localeCompare(b.file) ||
      a.issue.line - b.issue.line,
  );

  const lines: string[] = ['## mule-lint report', ''];
  lines.push(
    `**${summary.bySeverity.error}** errors · **${summary.bySeverity.warning}** warnings · ` +
      `**${summary.bySeverity.info}** info across ${summary.totalFiles} files` +
      (summary.parseErrors > 0 ? ` · **${summary.parseErrors}** parse errors` : ''),
    '',
  );

  const parseFailures = report.files.filter((file) => !file.parsed);
  if (parseFailures.length > 0) {
    lines.push('### Parse errors', '');
    for (const file of parseFailures) {
      lines.push(`- \`${cell(file.relativePath)}\`: ${cell(file.parseError ?? 'Failed to parse')}`);
    }
    lines.push('');
  }

  if (rows.length === 0) {
    lines.push('No issues found. ✅');
    return lines.join('\n');
  }

  lines.push('| Severity | Rule | Location | Message |', '| --- | --- | --- | --- |');
  for (const { file, issue } of rows.slice(0, MAX_ROWS)) {
    const location = issue.line > 0 ? `${file}:${issue.line}` : file;
    lines.push(
      `| ${SEVERITY_LABEL[issue.severity]} | ${cell(issue.ruleId)} | ${cell(location)} | ${cell(issue.message)} |`,
    );
  }
  if (rows.length > MAX_ROWS) {
    lines.push(
      '',
      `_Showing ${MAX_ROWS} of ${rows.length} issues. Use \`-f html\` for the full report._`,
    );
  }
  return lines.join('\n');
}
