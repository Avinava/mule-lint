import { formatHtml } from '../../src/formatters/HtmlFormatter';
import { LintReport } from '../../src/types/Report';
import { Rule } from '../../src/types/Rule';

const hostileRule = {
  id: 'X-1',
  name: '</script><img src=x onerror=alert(1)>',
  description: 'd',
  severity: 'error',
  category: "naming');alert(1);//",
  validate: () => [],
} as unknown as Rule;

const report: LintReport = {
  projectRoot: 'C:\\work\\orders-api',
  timestamp: '2024-01-01T00:00:00.000Z',
  durationMs: 1,
  files: [
    {
      filePath: '/p/a.xml',
      relativePath: 'a.xml',
      parsed: true,
      issues: [{ severity: 'error', ruleId: 'X-1', message: 'm', line: 1 }],
    },
    { filePath: '/p/b.xml', relativePath: 'b.xml', parsed: false, parseError: 'boom', issues: [] },
  ],
  summary: {
    totalFiles: 2,
    filesWithIssues: 1,
    parseErrors: 1,
    bySeverity: { error: 1, warning: 0, info: 0 },
    byRule: { 'X-1': 1 },
  },
};

describe('HtmlFormatter hardening', () => {
  const html = formatHtml(report, [hostileRule]);

  it('cannot be broken out of the embedded data by rule metadata', () => {
    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script>');
  });

  it('does not put category names into inline event handlers', () => {
    // Report-derived category names must never be interpolated into an inline handler.
    expect(html).not.toContain("toggleCategory('naming");
  });

  it('includes parse failures as PARSE-ERROR issues', () => {
    expect(html).toContain('"ruleId":"PARSE-ERROR"');
    expect(html).toContain('"message":"boom"');
  });

  it('derives the project name from Windows paths', () => {
    expect(html).toContain('"projectName":"orders-api"');
  });
});
