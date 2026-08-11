import { MetricsAggregator } from './MetricsAggregator';
import { LintReport } from '../types/Report';
import { Rule, Severity } from '../types/Rule';

/** Return a report containing only selected severities with consistent aggregates. */
export function filterReportBySeverity(
  report: LintReport,
  severities: ReadonlySet<Severity>,
  rules: Rule[],
): LintReport {
  const files = report.files.map((file) => ({
    ...file,
    issues: file.issues.filter((issue) => severities.has(issue.severity)),
  }));
  const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const byRule: Record<string, number> = {};
  let filesWithIssues = 0;

  for (const file of files) {
    if (file.relativePath !== 'Project Structure' && file.issues.length > 0) {
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
    metrics: MetricsAggregator.aggregateMetrics(filtered, rules) ?? filtered.metrics,
  };
}
