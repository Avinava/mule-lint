import { formatMarkdown } from '../../src/formatters/MarkdownFormatter';
import { formatGithub } from '../../src/formatters/GithubFormatter';
import { formatJunit } from '../../src/formatters/JunitFormatter';
import { format } from '../../src/formatters';
import { LintReport } from '../../src/types/Report';

const report: LintReport = {
  projectRoot: '/proj',
  timestamp: '2024-01-01T00:00:00.000Z',
  durationMs: 1,
  files: [
    {
      filePath: '/proj/a.xml',
      relativePath: 'src/a,b.xml',
      parsed: true,
      issues: [
        {
          severity: 'error',
          ruleId: 'E-1',
          message: 'bad | pipe <tag>\nnext 100%',
          line: 3,
          column: 2,
        },
        { severity: 'info', ruleId: 'I-1', message: 'fyi', line: 0 },
      ],
    },
    {
      filePath: '/proj/b.xml',
      relativePath: 'b.xml',
      parsed: false,
      parseError: 'boom',
      issues: [],
    },
  ],
  summary: {
    totalFiles: 2,
    filesWithIssues: 1,
    parseErrors: 1,
    bySeverity: { error: 1, warning: 0, info: 1 },
    byRule: { 'E-1': 1, 'I-1': 1 },
  },
};

describe('CI formatters', () => {
  it('markdown escapes table-breaking characters and lists parse errors', () => {
    const md = formatMarkdown(report);
    expect(md).toContain('bad \\| pipe \\<tag\\> next 100%');
    expect(md).toContain('### Parse errors');
    expect(md.split('\n').filter((l) => l.startsWith('| ')).length).toBe(4);
  });

  it('markdown reports a clean run', () => {
    const clean = { ...report, files: [], summary: { ...report.summary, parseErrors: 0 } };
    expect(formatMarkdown(clean)).toContain('No issues found');
  });

  it('github emits escaped workflow commands', () => {
    const lines = formatGithub(report).split('\n');
    expect(lines[0]).toBe(
      '::error file=src/a%2Cb.xml,line=3,col=2,title=E-1::bad | pipe <tag>%0Anext 100%25',
    );
    expect(lines[1]).toBe('::notice file=src/a%2Cb.xml,title=I-1::fyi');
    expect(lines[2]).toBe('::error file=b.xml,title=PARSE-ERROR::boom');
  });

  it('junit is well-formed with failures only for errors and warnings', () => {
    const xml = formatJunit(report);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<testsuites name="mule-lint" tests="3" failures="2">');
    expect(xml).toContain('message="bad | pipe &lt;tag&gt;\nnext 100%"');
    expect(xml).toContain('<testcase classname="src/a,b.xml" name="I-1"/>');
  });

  it('format() dispatches every new type', () => {
    for (const type of ['markdown', 'github', 'junit'] as const) {
      expect(format(report, type).length).toBeGreaterThan(0);
    }
  });
});
