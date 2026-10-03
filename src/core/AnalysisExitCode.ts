import type { LintReport } from '../types/Report';
import { getExecutionExitCode } from './ReportContract';
import { getQualityGateExitCode } from './QualityGateEvaluator';

/** Legacy finding exit policy, independent of whether a caller evaluated a gate. */
export function getFindingExitCode(report: LintReport, failOnWarning = false): number {
  const execution = getExecutionExitCode(report);
  if (execution !== undefined) return execution;
  return report.summary.bySeverity.error > 0 ||
    (failOnWarning && report.summary.bySeverity.warning > 0)
    ? 1
    : 0;
}

/** Execution errors always precede gate and finding outcomes. */
export function getAnalysisExitCode(report: LintReport, failOnWarning = false): number {
  return (
    getExecutionExitCode(report) ??
    (report.gate
      ? getQualityGateExitCode(report.gate.status, failOnWarning)
      : getFindingExitCode(report, failOnWarning))
  );
}
