import { filterReportBySeverity } from '../../src/core/ReportFilter';
import { Rule } from '../../src/types';
import { LintReport } from '../../src/types/Report';

describe('filterReportBySeverity', () => {
  it('keeps summaries and metrics aligned with quiet output', () => {
    const rules: Rule[] = [
      {
        id: 'TEST-001',
        name: 'Warning',
        description: 'warning rule',
        severity: 'warning',
        category: 'standards',
        validate: () => [],
      },
    ];
    const report: LintReport = {
      projectRoot: '/test',
      timestamp: new Date(0).toISOString(),
      durationMs: 0,
      files: [
        {
          filePath: '/test/a.xml',
          relativePath: 'a.xml',
          parsed: true,
          issues: [
            { line: 1, ruleId: 'TEST-001', message: 'warning', severity: 'warning' },
            { line: 2, ruleId: 'PARSE-ERROR', message: 'error', severity: 'error' },
          ],
        },
      ],
      summary: {
        totalFiles: 1,
        filesWithIssues: 1,
        parseErrors: 0,
        bySeverity: { error: 1, warning: 1, info: 0 },
        byRule: { 'TEST-001': 1, 'PARSE-ERROR': 1 },
      },
    };

    const filtered = filterReportBySeverity(report, new Set(['error']), rules);
    expect(filtered.files[0].issues).toHaveLength(1);
    expect(filtered.summary.bySeverity).toEqual({ error: 1, warning: 0, info: 0 });
    expect(filtered.summary.byRule).toEqual({ 'PARSE-ERROR': 1 });
    expect(report.files[0].issues).toHaveLength(2);
  });
});
