import { formatSarif } from '../../src/formatters/SarifFormatter';
import { formatCsv } from '../../src/formatters/CsvFormatter';
import { ALL_RULES } from '../../src/rules';
import { getRuleDefinition } from '../../src/catalog';
import { LintReport } from '../../src/types/Report';

interface SarifResultShape {
  ruleId: string;
  locations?: { physicalLocation: { artifactLocation: { uri: string }; region?: object } }[];
  partialFingerprints?: Record<string, string>;
  properties?: { suggestion?: string };
  fixes?: unknown;
}

const report: LintReport = {
  projectRoot: '/proj',
  timestamp: '2024-01-01T00:00:00.000Z',
  durationMs: 1,
  files: [
    {
      filePath: '/proj/src/main/mule/my flow.xml',
      relativePath: 'src/main/mule/my flow.xml',
      parsed: true,
      issues: [
        {
          severity: 'error',
          ruleId: 'MULE-003',
          message: '=HYPERLINK("http://x.invalid")',
          line: 4,
          column: 0,
          suggestion: 'Use a global error handler',
        },
      ],
    },
    {
      filePath: '/proj/Project Structure',
      relativePath: 'Project Structure',
      parsed: true,
      issues: [{ severity: 'warning', ruleId: 'MULE-802', message: 'Missing folder', line: 0 }],
    },
    {
      filePath: '/proj/bad.xml',
      relativePath: 'bad.xml',
      parsed: false,
      parseError: 'boom',
      issues: [],
    },
  ],
  summary: {
    totalFiles: 3,
    filesWithIssues: 2,
    parseErrors: 1,
    bySeverity: { error: 1, warning: 1, info: 0 },
    byRule: { 'MULE-003': 1, 'MULE-802': 1 },
  },
};

describe('SarifFormatter', () => {
  const sarif = JSON.parse(formatSarif(report)) as {
    runs: {
      tool: { driver: { rules: { id: string; helpUri?: string }[] } };
      results: SarifResultShape[];
    }[];
  };
  const run = sarif.runs[0];

  it('never emits the invalid fixes array and keeps the suggestion as a property', () => {
    const result = run.results.find((r) => r.ruleId === 'MULE-003')!;
    expect(result.fixes).toBeUndefined();
    expect(result.properties?.suggestion).toBe('Use a global error handler');
  });

  it('omits columns below 1 and the region for project-level issues', () => {
    const result = run.results.find((r) => r.ruleId === 'MULE-003')!;
    const region = result.locations![0].physicalLocation.region as Record<string, number>;
    expect(region.startLine).toBe(4);
    expect(region.startColumn).toBeUndefined();
  });

  it('gives project-level results no location instead of a fake URI', () => {
    const result = run.results.find((r) => r.ruleId === 'MULE-802')!;
    expect(result.locations).toBeUndefined();
  });

  it('percent-encodes artifact URIs', () => {
    const result = run.results.find((r) => r.ruleId === 'MULE-003')!;
    expect(result.locations![0].physicalLocation.artifactLocation.uri).toBe(
      'src/main/mule/my%20flow.xml',
    );
  });

  it('declares PARSE-ERROR as a rule so its results resolve', () => {
    expect(run.tool.driver.rules.map((r) => r.id)).toContain('PARSE-ERROR');
  });

  it('adds a stable partial fingerprint independent of line number', () => {
    const moved = structuredClone(report);
    moved.files[0].issues[0].line = 99;
    const original = run.results.find((r) => r.ruleId === 'MULE-003')!;
    const shifted = (
      JSON.parse(formatSarif(moved)) as { runs: { results: SarifResultShape[] }[] }
    ).runs[0].results.find((r) => r.ruleId === 'MULE-003')!;
    expect(original.partialFingerprints?.['muleLint/v1']).toMatch(/^[0-9a-f]{64}$/);
    expect(shifted.partialFingerprints).toEqual(original.partialFingerprints);
  });

  it('links each rule to its own catalog heading', () => {
    const uris = new Set(run.tool.driver.rules.map((r) => r.helpUri).filter(Boolean));
    expect(uris.size).toBeGreaterThan(50);
  });
});

describe('Rule docs anchors', () => {
  it('match a heading in the rules catalog for every rule', async () => {
    const fs = await import('fs');
    const catalog = fs.readFileSync('docs/best-practices/rules-catalog.md', 'utf-8');
    const slugs = new Set(
      [...catalog.matchAll(/^### (.+)$/gm)].map((m) => {
        const explicit = /\{ #([\w-]+) \}\s*$/.exec(m[1]);
        if (explicit) return explicit[1];
        return m[1]
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
      }),
    );
    const missing = ALL_RULES.filter((rule) => {
      const anchor = getRuleDefinition(rule.id)!.docsUrl.split('#')[1];
      return !anchor || !slugs.has(anchor);
    }).map((rule) => rule.id);
    expect(missing).toEqual([]);
  });
});

describe('CsvFormatter hardening', () => {
  it('neutralizes spreadsheet formulas', () => {
    const row = formatCsv(report)
      .split('\n')
      .find((line) => line.includes('MULE-003'))!;
    expect(row).toContain(`"'=HYPERLINK(""http://x.invalid"")"`);
  });
});
