import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createReportContract,
  getExecutionExitCode,
  reportSchema,
} from '../../src/core/ReportContract';
import { evaluateQualityGate } from '../../src/core/QualityGateEvaluator';
import { filterReportBySeverity } from '../../src/core/ReportFilter';
import { applyBaseline, parseBaseline } from '../../src/core/Baseline';
import { formatJson } from '../../src/formatters/JsonFormatter';
import { formatSarif } from '../../src/formatters/SarifFormatter';
import { formatHtml } from '../../src/formatters/HtmlFormatter';
import { getExitCode } from '../../src/formatters/TableFormatter';
import { LintEngine } from '../../src/engine/LintEngine';
import { registerRunLintAnalysis } from '../../src/mcp/tools/runLintAnalysis';
import type { TextToolResult } from '../../src/mcp/register';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LintReport, Rule } from '../../src/types';

function report(): LintReport {
  return {
    projectRoot: '/test',
    timestamp: '2026-01-01T00:00:00Z',
    durationMs: 1,
    files: [{ filePath: '/test/source.xml', relativePath: 'source.xml', parsed: true, issues: [] }],
    summary: {
      totalFiles: 1,
      filesWithIssues: 0,
      parseErrors: 0,
      bySeverity: { error: 0, warning: 0, info: 0 },
      byRule: {},
    },
  };
}

describe('Versioned report contract', () => {
  it('marks unknown legacy scope without inventing a profile or checked rules', () => {
    const legacy = createReportContract(report());
    expect(legacy.scan).toMatchObject({
      scopeKnown: false,
      target: null,
      profile: null,
      enabledRuleIds: [],
    });
    expect(reportSchema.safeParse({ ...legacy, schemaVersion: 2 }).success).toBe(false);
    const known = report();
    known.scope = {
      target: { kind: 'file', path: 'source.xml' },
      enabledRuleIds: ['TEST-001'],
      include: ['**/*.xml'],
      exclude: [],
    };
    expect(createReportContract(known).scan).toMatchObject({
      scopeKnown: true,
      target: { kind: 'file', path: 'source.xml' },
      enabledRuleIds: ['TEST-001'],
    });
  });

  it('uses remediation to deterministically order otherwise identical findings', () => {
    const first = report();
    first.files[0].issues = ['second', 'first'].map((suggestion) => ({
      ruleId: 'TEST-001',
      severity: 'warning',
      line: 1,
      message: 'duplicate',
      suggestion,
    }));
    const second = structuredClone(first);
    second.files[0].issues.reverse();
    expect(createReportContract(first).findings).toEqual(createReportContract(second).findings);
  });

  it('distinguishes clean, no files and incomplete analysis', () => {
    expect(createReportContract(report()).execution.status).toBe('complete');
    const empty = report();
    empty.files = [];
    empty.summary.totalFiles = 0;
    expect(createReportContract(empty).execution.status).toBe('no-files');
    expect(getExitCode(empty)).toBe(2);
    const broken = report();
    broken.files[0].parsed = false;
    broken.files[0].parseError = 'invalid XML';
    broken.summary.parseErrors = 1;
    const output = createReportContract(broken);
    expect(reportSchema.safeParse(output).success).toBe(true);
    expect(output.execution.status).toBe('incomplete');
    expect(output.findings[0].ruleId).toBe('PARSE-ERROR');
    expect(output.summary.bySeverity.error).toBe(1);
    expect(getExitCode(broken)).toBe(3);
    expect(evaluateQualityGate(broken, { name: 'Permissive', conditions: [] }).status).toBe(
      'failed',
    );
    const html = formatHtml(broken);
    expect(html).toContain('"status":"incomplete"');
    expect(html).toContain('"bySeverity":{"error":1,"warning":0,"info":0}');
    expect(html).toContain('"issueType":"diagnostic"');
  });

  it('keeps rule execution failures through selection and baseline, including SARIF', () => {
    const failed = report();
    failed.ruleErrors = [{ ruleId: 'TEST-001', message: 'failed' }];
    failed.files[0].issues = [
      { ruleId: 'TEST-002', severity: 'warning', line: 2, message: 'finding' },
    ];
    const baseline = parseBaseline(formatJson(failed));
    const selected = applyBaseline(
      filterReportBySeverity(failed, new Set(['error']), []),
      baseline,
      [],
    ).report;
    expect(createReportContract(selected).execution.status).toBe('incomplete');
    expect(createReportContract(selected).findings).toEqual([]);
    expect(getExecutionExitCode(selected)).toBe(2);
    expect(evaluateQualityGate(selected).status).toBe('failed');
    expect(formatSarif(selected)).toContain('"executionSuccessful": false');
    expect(formatSarif(selected)).toContain('"id": "TEST-001"');
    expect(formatJson(selected)).toBe('[]');
  });

  it('sorts findings independently of traversal and preserves duplicate occurrences and project scope', () => {
    const a = report();
    a.files[0].issues = [
      { ruleId: 'TEST-002', severity: 'info', line: 5, message: 'duplicate' },
      { ruleId: 'TEST-001', severity: 'error', line: 2, message: 'first' },
      { ruleId: 'TEST-002', severity: 'info', line: 8, message: 'duplicate' },
    ];
    a.files.push({
      filePath: '/test/Project Structure',
      relativePath: 'Project Structure',
      parsed: true,
      issues: [{ ruleId: 'TEST-003', severity: 'warning', line: 0, message: 'project' }],
    });
    const b = structuredClone(a);
    b.files.reverse();
    for (const file of b.files) file.issues.reverse();
    const first = createReportContract(a);
    const second = createReportContract(b);
    expect(first.findings).toEqual(second.findings);
    expect(
      first.findings
        .filter((finding) => finding.ruleId === 'TEST-002')
        .map((finding) => finding.occurrence),
    ).toEqual([1, 2]);
    expect(first.findings[0].location).toEqual({ scope: 'project' });
    expect(JSON.stringify(first)).not.toContain('/test');
  });
});

describe('Execution failures reach MCP consumers', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-'));
  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  async function invoke(engine: LintEngine, target: string): Promise<TextToolResult> {
    let handler: ((input: { projectPath: string }) => Promise<TextToolResult>) | undefined;
    const server = {
      registerTool(_name: string, _config: unknown, callback: typeof handler) {
        handler = callback;
      },
    };
    registerRunLintAnalysis(server as unknown as McpServer, engine);
    return handler!({ projectPath: target });
  }

  it('returns structured parse diagnostics and isError, retaining legacy issue groups', async () => {
    const target = path.join(root, 'invalid.xml');
    fs.writeFileSync(target, '');
    const result = await invoke(new LintEngine({ rules: [] }), target);
    expect(result.isError).toBe(true);
    const contract = reportSchema.parse(result.structuredContent);
    expect(contract.summary.parseErrors).toBe(1);
    expect(contract.findings[0].ruleId).toBe('PARSE-ERROR');
    expect(result.content[0].text).toContain('"totalIssues": 1');
    expect(result.content[0].text).not.toContain('"rating": "A"');
  });

  it('returns an explicit tool error when scanning cannot start', async () => {
    const result = await invoke(new LintEngine({ rules: [] }), path.join(root, 'missing'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Analysis failed:');
    expect(result.structuredContent).toBeUndefined();
  });

  it('records the actual target and effective rule scope', async () => {
    const target = path.join(root, 'single.xml');
    fs.writeFileSync(target, '<mule/>');
    const result = await invoke(new LintEngine({ rules: [] }), target);
    expect(reportSchema.parse(result.structuredContent).scan).toMatchObject({
      scopeKnown: true,
      target: { kind: 'file', path: 'single.xml' },
      enabledRuleIds: [],
      profile: null,
    });
    expect(JSON.parse(result.content[0].text) as unknown).toMatchObject({ profile: null });
  });

  it('uses the same project-relative location and identity for nested file and project scans', async () => {
    const project = path.join(root, 'nested-project');
    const target = path.join(project, 'src/main/mule/example.xml');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(path.join(project, 'mule-artifact.json'), '{}');
    fs.writeFileSync(target, '<mule/>');
    const rule: Rule = {
      id: 'TEST-001',
      name: 'Synthetic',
      description: 'Synthetic finding',
      severity: 'warning',
      category: 'standards',
      validate() {
        return [{ ruleId: 'TEST-001', severity: 'warning', line: 1, message: 'Review' }];
      },
    };
    const engine = new LintEngine({ rules: [rule] });
    const file = createReportContract(await engine.scan(target));
    const directory = createReportContract(await engine.scan(project));
    expect(file.scan.target).toEqual({ kind: 'file', path: 'src/main/mule/example.xml' });
    expect(file.findings[0].location.path).toBe('src/main/mule/example.xml');
    expect(file.findings).toEqual(directory.findings);
  });

  it('never returns clean scan or snippet evidence when a rule throws', async () => {
    const rule: Rule = {
      id: 'TEST-001',
      name: 'Failure',
      description: 'Synthetic failure',
      severity: 'info',
      category: 'standards',
      validate() {
        throw new Error('failed');
      },
    };
    const engine = new LintEngine({ rules: [rule] });
    const target = path.join(root, 'valid.xml');
    const xml = '<mule/>';
    fs.writeFileSync(target, xml);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await invoke(engine, target);
      expect(result.isError).toBe(true);
      expect(reportSchema.parse(result.structuredContent).execution.diagnostics[0].ruleId).toBe(
        rule.id,
      );
      expect(() => engine.scanContent(xml, target)).toThrow('Analysis incomplete');
    } finally {
      log.mockRestore();
    }
  });
});
