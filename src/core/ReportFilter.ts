import { MetricsAggregator } from './MetricsAggregator';
import { LintReport } from '../types/Report';
import { Issue, Rule, Severity } from '../types/Rule';

/** Return a report containing only selected severities with consistent aggregates. */
export function filterReportBySeverity(
  report: LintReport,
  severities: ReadonlySet<Severity>,
  rules: Rule[],
  excludedRuleIds: ReadonlySet<string> = new Set(),
): LintReport {
  return filterReportIssues(
    report,
    (issue) => severities.has(issue.severity),
    rules,
    excludedRuleIds,
  );
}

/** Return a report keeping only issues the predicate accepts, with consistent aggregates. */
export function filterReportIssues(
  report: LintReport,
  keep: (issue: Issue, relativePath: string) => boolean,
  rules: Rule[],
  excludedRuleIds: ReadonlySet<string> = new Set(),
): LintReport {
  const files = report.files.map((file) => ({
    ...file,
    issues: file.issues.filter((issue) => keep(issue, file.relativePath)),
  }));
  const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const byRule: Record<string, number> = {};
  let filesWithIssues = 0;

  for (const [index, file] of files.entries()) {
    // Mirror buildSummary(): only scanned source files count, and they are the
    // leading entries. Project results are appended after them.
    if (index < report.summary.totalFiles && file.issues.length > 0) {
      filesWithIssues++;
    }
    for (const issue of file.issues) {
      bySeverity[issue.severity]++;
      byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
    }
  }

  const filtered: LintReport = {
    ...report,
    files,
    summary: {
      ...report.summary,
      filesWithIssues,
      bySeverity,
      byRule,
    },
  };
  return {
    ...filtered,
    metrics:
      MetricsAggregator.aggregateMetrics(filtered, rules, excludedRuleIds) ?? filtered.metrics,
  };
}
