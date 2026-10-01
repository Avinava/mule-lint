import { createHash } from 'crypto';
import { LintReport } from '../types/Report';
import { Rule } from '../types/Rule';
import { filterReportIssues } from './ReportFilter';

export interface BaselineStats {
  /** Issues present now but not in the baseline. */
  newIssues: number;
  /** Issues present now and in the baseline. */
  unchanged: number;
  /** Baseline issues that no longer occur. */
  fixed: number;
}

/**
 * Identity of an issue that survives line shifts: rule, file, and message with
 * whitespace collapsed. Shared with SARIF `partialFingerprints`.
 */
export function fingerprintIssue(ruleId: string, relativePath: string, message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(`${ruleId}\n${relativePath}\n${normalized}`).digest('hex');
}

/**
 * Read fingerprints from a previous `--format json` run (flat issue array).
 * Duplicates are kept as counts so two identical issues baseline two issues.
 */
export function parseBaseline(content: string): Map<string, number> {
  const data: unknown = JSON.parse(content);
  if (!Array.isArray(data)) {
    throw new Error('Baseline must be the JSON output of a previous run (an array of issues)');
  }
  const counts = new Map<string, number>();
  for (const entry of data as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { ruleId, relativePath, message } = entry as Record<string, unknown>;
    if (
      typeof ruleId !== 'string' ||
      typeof relativePath !== 'string' ||
      typeof message !== 'string'
    ) {
      throw new Error('Baseline entries need ruleId, relativePath, and message');
    }
    const key = fingerprintIssue(ruleId, relativePath, message);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Drop issues already in the baseline; the gate and exit code then see only new ones. */
export function applyBaseline(
  report: LintReport,
  baseline: ReadonlyMap<string, number>,
  rules: Rule[],
  excludedRuleIds: ReadonlySet<string> = new Set(),
): { report: LintReport; stats: BaselineStats } {
  const remaining = new Map(baseline);
  let unchanged = 0;
  let newIssues = 0;

  const filtered = filterReportIssues(
    report,
    (issue, relativePath) => {
      const key = fingerprintIssue(issue.ruleId, relativePath, issue.message);
      const left = remaining.get(key) ?? 0;
      if (left > 0) {
        remaining.set(key, left - 1);
        unchanged++;
        return false;
      }
      newIssues++;
      return true;
    },
    rules,
    excludedRuleIds,
  );

  let fixed = 0;
  for (const left of remaining.values()) fixed += left;
  return { report: filtered, stats: { newIssues, unchanged, fixed } };
}
