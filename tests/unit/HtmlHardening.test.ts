import { Linter } from 'eslint';
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

describe('HtmlFormatter accessibility and offline packaging', () => {
  const html = formatHtml(report, [hostileRule]);

  it('labels the search box and exposes the side panel as a dialog', () => {
    expect(html).toContain('aria-label="Search issues"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Close details"');
    expect(html).toContain('Escape');
  });

  it('embeds every runtime script, stylesheet and font without network dependencies', () => {
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+(?:stylesheet|preconnect)/);
    expect(html).not.toMatch(/<img[^>]+src=["']https?:/);
    expect(html).toContain('data:font/woff2;base64,');
    expect(html).toContain('Browser dependency licenses:');
    expect(html.replace(/<script[\s\S]*?<\/script>/g, '')).not.toMatch(
      /\bon(?:click|error|input)=/,
    );
  });
});

describe('Generated report JavaScript', () => {
  it('parses every executable script and rejects duplicate object keys', () => {
    const html = formatHtml(report, [hostileRule]);
    const linter = new Linter();
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(
      (match) => !match[1].includes('application/json') && match[2].trim(),
    );
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(
        linter.verify(script[2], {
          languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
          rules: { 'no-dupe-keys': 'error', 'no-unreachable': 'error' },
        }),
      ).toEqual([]);
    }
  }, 20000);
});
