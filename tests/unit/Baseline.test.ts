import { applyBaseline, fingerprintIssue, parseBaseline } from '../../src/core/Baseline';
import { formatJson } from '../../src/formatters/JsonFormatter';
import { ALL_RULES } from '../../src/rules';
import { LintReport } from '../../src/types/Report';

function makeReport(lines: number[], extra: string[] = []): LintReport {
  const issues = [
    ...lines.map((line) => ({
      severity: 'warning' as const,
      ruleId: 'R-1',
      message: 'same',
      line,
    })),
    ...extra.map((message) => ({ severity: 'error' as const, ruleId: 'R-2', message, line: 1 })),
  ];
  return {
    projectRoot: '/p',
    timestamp: '2024-01-01T00:00:00.000Z',
    durationMs: 1,
    files: [{ filePath: '/p/a.xml', relativePath: 'a.xml', parsed: true, issues }],
    summary: {
      totalFiles: 1,
      filesWithIssues: 1,
      parseErrors: 0,
      bySeverity: { error: extra.length, warning: lines.length, info: 0 },
      byRule: {},
    },
  };
}

describe('Baseline', () => {
  const baseline = parseBaseline(formatJson(makeReport([10, 20])));

  it('ignores line shifts and whitespace in messages', () => {
    expect(fingerprintIssue('R', 'f', 'a  b\n c')).toBe(fingerprintIssue('R', 'f', 'a b c'));
    const { stats } = applyBaseline(makeReport([11, 25]), baseline, ALL_RULES);
    expect(stats).toEqual({ newIssues: 0, unchanged: 2, fixed: 0 });
  });

  it('reports only new issues and keeps summary consistent', () => {
    const { report, stats } = applyBaseline(makeReport([10, 20], ['fresh']), baseline, ALL_RULES);
    expect(stats.newIssues).toBe(1);
    expect(report.files[0]?.issues.map((i) => i.message)).toEqual(['fresh']);
    expect(report.summary.bySeverity).toEqual({ error: 1, warning: 0, info: 0 });
  });

  it('treats a third duplicate as new and counts fixed ones', () => {
    expect(applyBaseline(makeReport([1, 2, 3]), baseline, ALL_RULES).stats.newIssues).toBe(1);
    expect(applyBaseline(makeReport([1]), baseline, ALL_RULES).stats.fixed).toBe(1);
  });

  it('rejects input that is not a flat issue array', () => {
    expect(() => parseBaseline('{}')).toThrow(/array of issues/);
    expect(() => parseBaseline('[{"ruleId":"R"}]')).toThrow(/ruleId, relativePath, and message/);
  });
});
