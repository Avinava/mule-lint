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
        line: finding.location.line ?? 0,
        column: finding.location.column,
        category: finding.category ?? 'General',
        ruleDescription: rulesById.get(finding.ruleId)?.description ?? 'Analysis diagnostic',
        ruleName: rulesById.get(finding.ruleId)?.name ?? finding.ruleId,
        issueType:
          finding.issueType ?? (finding.ruleId === 'PARSE-ERROR' ? 'diagnostic' : 'code-smell'),
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
    metrics: report.metrics ?? {
      flowCount: 0,
      subFlowCount: 0,
      dwTransformCount: 0,
      connectorConfigCount: 0,
      httpListenerCount: 0,
      connectorTypes: [],
      errorHandlerCount: 0,
      choiceRouterCount: 0,
      apiEndpoints: [],
      environments: [],
      securityPatterns: [],
      externalServices: [],
      schedulers: [],
      fileComplexity: {},
      flowComplexityData: [],
    },
  };
}

export type ClientReport = ReturnType<typeof buildClientData>;
export type ClientIssue = ClientReport['files'][number]['issues'][number] & { fileName: string };
