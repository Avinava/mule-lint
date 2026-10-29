import type { LintReport } from '../../types/Report';
import type { Rule } from '../../types/Rule';
import type { ReportContract } from '../../core/ReportContract';
import packageJson from '../../../package.json';

/** HTML and structured automation share finding identities and parse diagnostics. */
function enrichFiles(report: LintReport, rules: Rule[], contract: ReportContract) {
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const files = new Map(report.files.map((file) => [file.relativePath.replace(/\\/g, '/'), file]));
  return [...files.entries()].map(([relativePath, file]) => ({
    ...file,
    relativePath,
    issues: contract.findings
      .filter((finding) => (finding.location.path ?? 'Project Structure') === relativePath)
      .map((finding) => ({
        ...finding,
        // The automation projection uses line 1 for parse failures; that is not a measured source location.
        location:
          finding.ruleId === 'PARSE-ERROR'
            ? { ...finding.location, line: undefined, column: undefined }
            : finding.location,
        line: finding.ruleId === 'PARSE-ERROR' ? 0 : (finding.location.line ?? 0),
        column: finding.ruleId === 'PARSE-ERROR' ? undefined : finding.location.column,
        category: finding.category ?? 'General',
        ruleDescription:
          rulesById.get(finding.ruleId)?.description ??
          (finding.ruleId === 'PARSE-ERROR'
            ? 'The XML file could not be parsed.'
            : 'Rule description not supplied.'),
        ruleName: rulesById.get(finding.ruleId)?.name ?? finding.ruleId,
        issueType:
          finding.issueType ?? (finding.ruleId === 'PARSE-ERROR' ? 'diagnostic' : 'unknown'),
        file: relativePath,
      })),
  }));
}

/**
 * Build client-side data payload
 */

export function buildClientData(report: LintReport, rules: Rule[], contract: ReportContract) {
  const projectName = report.projectRoot.split(/[\\/]/).filter(Boolean).pop() ?? 'MuleSoft Project';

  return {
    metricsAvailable: Boolean(report.metrics),
    gateDetails: report.gate,
    metadata: {
      projectName,
      projectRoot: report.projectRoot,
      timestamp: report.timestamp,
      version: packageJson.version,
      filesScanned: report.summary.totalFiles,
      duration: report.durationMs,
    },
    summary: { ...report.summary, bySeverity: contract.summary.bySeverity },
    execution: contract.execution,
    gate: contract.gate,
    scan: contract.scan,
    selection: contract.selection,
    files: enrichFiles(report, rules, contract),
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      severity: r.severity,
      description: r.description,
      issueType: r.issueType ?? 'code-smell',
    })),
    metrics: report.metrics,
  };
}

export type ClientReport = ReturnType<typeof buildClientData>;
export type ClientIssue = ClientReport['files'][number]['issues'][number] & { fileName: string };
