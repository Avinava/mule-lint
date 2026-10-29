import { buildClientData } from '../../src/formatters/html/reportData';
import { createReportContract } from '../../src/core/ReportContract';
import fixture from '../fixtures/reports/html-characterization.json';
import { formatHtml } from '../../src/formatters/HtmlFormatter';
import type { LintReport } from '../../src/types/Report';

const report = fixture as LintReport;

describe('HTML report characterization', () => {
  const html = formatHtml(report, []);

  it('preserves stable DOM hooks for navigation, filters, charts and dialogs', () => {
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    for (const id of ['report-data', 'report-app', 'finding-dialog', 'main-content'])
      expect(ids.has(id), id).toBe(true);
  });

  it('preserves diagnostic projection, stable positions and baseline context', () => {
    const payload = html.match(
      /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/,
    )?.[1];
    expect(payload).toBeDefined();
    const data: unknown = JSON.parse(payload ?? '{}');
    expect(data).toMatchObject({
      metadata: { projectName: 'orders-api', filesScanned: 2, duration: 42 },
      execution: {
        status: 'incomplete',
        diagnostics: [{ kind: 'parse-error', relativePath: 'broken.xml' }],
      },
      selection: report.selection,
      scan: { scopeKnown: true, profile: 'recommended', enabledRuleIds: ['SYNTH-1'] },
      summary: { bySeverity: { error: 1, warning: 1, info: 0 } },
      files: [
        {
          relativePath: 'main.xml',
          issues: [
            {
              ruleId: 'SYNTH-1',
              line: 12,
              column: 3,
              suggestion: 'Use a named flow',
              fingerprintVersion: 'muleLint/v1',
            },
          ],
        },
        {
          relativePath: 'broken.xml',
          issues: [{ ruleId: 'PARSE-ERROR', severity: 'error', issueType: 'diagnostic' }],
        },
      ],
    });
  });
});

it('does not serialize invented inventory metrics for legacy reports', () => {
  const legacy = structuredClone(report);
  delete legacy.metrics;
  delete legacy.scope;
  const html = formatHtml(legacy, []);
  const payload = html.match(
    /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1];
  const data = JSON.parse(payload ?? '{}') as { metrics?: unknown };
  expect(data.metrics).toBeUndefined();
  expect(html).toContain('class="tab-count" >—</span>');
});

it('does not present the automation parse-error fallback line as a measured location', () => {
  const data = buildClientData(report, [], createReportContract(report, []));
  const failure = data.files
    .flatMap((file) => file.issues)
    .find((issue) => issue.ruleId === 'PARSE-ERROR');
  expect(failure?.location.line).toBeUndefined();
  expect(failure?.location.column).toBeUndefined();
});
