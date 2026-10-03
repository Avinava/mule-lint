import { z } from 'zod';
import packageJson from '../../package.json';
import { getRuleDefinition } from '../catalog';
import type { LintReport } from '../types/Report';
import type { Rule } from '../types/Rule';
import { fingerprintIssue } from './Baseline';

const diagnosticSchema = z.object({
  kind: z.enum(['parse-error', 'rule-error', 'no-files']),
  message: z.string(),
  ruleId: z.string().optional(),
  relativePath: z.string().optional(),
});

/** Versioned automation contract. Additive fields are allowed within version 1. */
export const reportSchema = z.object({
  schemaVersion: z.literal(1),
  tool: z.object({ name: z.string(), version: z.string() }),
  execution: z.object({
    status: z.enum(['complete', 'incomplete', 'no-files']),
    diagnostics: z.array(diagnosticSchema),
  }),
  scan: z.object({
    scopeKnown: z.boolean(),
    target: z.object({ kind: z.enum(['file', 'project']), path: z.string() }).nullable(),
    timestamp: z.string(),
    durationMs: z.number().nonnegative(),
    profile: z.string().nullable(),
    enabledRuleIds: z.array(z.string()),
    include: z.array(z.string()),
    exclude: z.array(z.string()),
  }),
  selection: z.object({
    quiet: z.boolean(),
    baseline: z
      .object({ newIssues: z.number(), unchanged: z.number(), fixed: z.number() })
      .optional(),
  }),
  gate: z.object({
    status: z.enum(['not-evaluated', 'passed', 'warning', 'failed']),
    name: z.string().optional(),
    message: z.string().optional(),
  }),
  summary: z.object({
    totalFiles: z.number(),
    totalIssues: z.number(),
    parseErrors: z.number(),
    ruleErrors: z.number(),
    bySeverity: z.object({ error: z.number(), warning: z.number(), info: z.number() }),
  }),
  findings: z.array(
    z.object({
      ruleId: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      message: z.string(),
      fingerprint: z.string(),
      fingerprintVersion: z.literal('muleLint/v1'),
      occurrence: z.number().int().positive(),
      location: z.object({
        scope: z.enum(['file', 'project']),
        path: z.string().optional(),
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
      }),
      suggestion: z.string().optional(),
      codeSnippet: z.string().optional(),
      category: z.string().optional(),
      issueType: z.string().optional(),
      standardIds: z.array(z.string()),
      docsUrl: z.string().optional(),
    }),
  ),
});

export type ReportContract = z.infer<typeof reportSchema>;
export type ScanExecution = ReportContract['execution'];

/** Execution health is independent of finding filters, baselines and gate thresholds. */
export function getScanExecution(report: LintReport): ScanExecution {
  const diagnostics: ScanExecution['diagnostics'] = report.files
    .filter((file) => !file.parsed)
    .map((file) => ({
      kind: 'parse-error',
      relativePath: file.relativePath.replace(/\\/g, '/'),
      message: file.parseError ?? 'Failed to parse file',
    }));
  for (const error of report.ruleErrors ?? []) {
    diagnostics.push({ kind: 'rule-error', ruleId: error.ruleId, message: error.message });
  }
  if (report.summary.totalFiles === 0)
    diagnostics.push({ kind: 'no-files', message: 'No source files were scanned.' });
  diagnostics.sort((a, b) =>
    compare(
      `${a.kind}\n${a.relativePath ?? ''}\n${a.ruleId ?? ''}\n${a.message}`,
      `${b.kind}\n${b.relativePath ?? ''}\n${b.ruleId ?? ''}\n${b.message}`,
    ),
  );
  return {
    status:
      diagnostics.some((item) => item.kind !== 'no-files') || report.summary.parseErrors > 0
        ? 'incomplete'
        : report.summary.totalFiles === 0
          ? 'no-files'
          : 'complete',
    diagnostics,
  };
}

/** Exit status for execution failures takes precedence over ordinary findings and gates. */
export function getExecutionExitCode(report: LintReport): number | undefined {
  if ((report.ruleErrors?.length ?? 0) > 0) return 2;
  if (report.summary.parseErrors > 0 || report.files.some((file) => !file.parsed)) return 3;
  if (report.summary.totalFiles === 0) return 2;
  return undefined;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Project a report once for structured consumers; legacy flat JSON remains unchanged. */
export function createReportContract(report: LintReport, rules: Rule[] = []): ReportContract {
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const findings: ReportContract['findings'] = report.files.flatMap((file) => {
    const issues = file.parsed
      ? file.issues
      : [
          {
            ruleId: 'PARSE-ERROR',
            severity: 'error' as const,
            line: 1,
            message: file.parseError ?? 'Failed to parse file',
          },
          ...file.issues,
        ];
    return issues.map((issue) => {
      const catalog = getRuleDefinition(issue.ruleId);
      const rule = rulesById.get(issue.ruleId);
      const project = file.relativePath === 'Project Structure';
      return {
        ruleId: issue.ruleId,
        severity: issue.severity,
        message: issue.message,
        fingerprint: fingerprintIssue(issue.ruleId, file.relativePath, issue.message),
        fingerprintVersion: 'muleLint/v1' as const,
        occurrence: 1,
        location: project
          ? { scope: 'project' as const }
          : {
              scope: 'file' as const,
              path: file.relativePath.replace(/\\/g, '/'),
              ...(issue.line > 0 ? { line: issue.line } : {}),
              ...((issue.column ?? 0) > 0 ? { column: issue.column } : {}),
            },
        ...(issue.suggestion ? { suggestion: issue.suggestion } : {}),
        ...(issue.codeSnippet ? { codeSnippet: issue.codeSnippet } : {}),
        ...((rule?.category ?? catalog?.category)
          ? { category: rule?.category ?? catalog?.category }
          : {}),
        ...((rule?.issueType ?? catalog?.issueType)
          ? { issueType: rule?.issueType ?? catalog?.issueType }
          : {}),
        standardIds: [...(catalog?.standardIds ?? [])].sort(),
        ...((rule?.docsUrl ?? catalog?.docsUrl)
          ? { docsUrl: rule?.docsUrl ?? catalog?.docsUrl }
          : {}),
      };
    });
  });
  findings.sort(
    (a, b) =>
      compare(a.location.path ?? '', b.location.path ?? '') ||
      (a.location.line ?? 0) - (b.location.line ?? 0) ||
      (a.location.column ?? 0) - (b.location.column ?? 0) ||
      compare(a.ruleId, b.ruleId) ||
      compare(a.message, b.message) ||
      compare(a.severity, b.severity) ||
      compare(JSON.stringify(a), JSON.stringify(b)),
  );
  const occurrences = new Map<string, number>();
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) {
    finding.occurrence = (occurrences.get(finding.fingerprint) ?? 0) + 1;
    occurrences.set(finding.fingerprint, finding.occurrence);
    bySeverity[finding.severity]++;
  }
  return {
    schemaVersion: 1,
    tool: { name: packageJson.name, version: packageJson.version },
    execution: getScanExecution(report),
    scan: {
      scopeKnown: report.scope !== undefined,
      target: report.scope?.target ?? null,
      timestamp: report.timestamp,
      durationMs: report.durationMs,
      profile: report.scope?.profile ?? null,
      enabledRuleIds: [...(report.scope?.enabledRuleIds ?? [])].sort(),
      include: [...(report.scope?.include ?? [])],
      exclude: [...(report.scope?.exclude ?? [])],
    },
    selection: {
      quiet: report.selection?.quiet ?? false,
      ...(report.selection?.baseline ? { baseline: report.selection.baseline } : {}),
    },
    gate: report.gate
      ? { name: report.gate.gate.name, status: report.gate.status, message: report.gate.message }
      : { status: 'not-evaluated' },
    summary: {
      totalFiles: report.summary.totalFiles,
      totalIssues: findings.length,
      parseErrors: report.summary.parseErrors,
      ruleErrors: report.ruleErrors?.length ?? 0,
      bySeverity,
    },
    findings,
  };
}
