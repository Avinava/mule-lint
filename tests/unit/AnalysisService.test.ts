import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyze } from '../../src/core/AnalysisService';
import { formatJson } from '../../src/formatters/JsonFormatter';
import { getExitCode } from '../../src/formatters/TableFormatter';
import { LintEngine } from '../../src/engine/LintEngine';
import type { Rule } from '../../src/types/Rule';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'analysis-pipeline-'));
afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});
let sequence = 0;
function fixture(xml = '<mule/>') {
  const dir = path.join(root, String(sequence++));
  fs.mkdirSync(dir);
  const target = path.join(dir, 'source.xml');
  fs.writeFileSync(target, xml);
  return { dir, target };
}
function rule(severity: 'error' | 'warning' = 'warning'): Rule {
  return {
    id: severity === 'error' ? 'TEST-002' : 'TEST-001',
    name: 'Synthetic',
    description: 'Synthetic characterization',
    severity,
    category: 'standards',
    validate() {
      return [{ ruleId: this.id, severity, line: 1, message: 'Review this finding' }];
    },
  };
}

describe('Shared analysis pipeline characterization', () => {
  it('does not discover configuration implicitly and retains default formatter/exit behavior', async () => {
    const { dir, target } = fixture();
    fs.writeFileSync(
      path.join(dir, 'mule-lint.json'),
      JSON.stringify({ rules: { 'TEST-001': false }, failOnWarning: true }),
    );
    const result = await analyze({ targetPath: target }, { rules: [rule()] });
    expect(result.contract.findings).toHaveLength(1);
    expect(result.formatter).toBe('table');
    expect(result.exitCode).toBe(0);
    expect(result.contract.selection).toEqual({ quiet: false });
  });

  it('loads only explicit configuration, preserves warnings and applies warning policy', async () => {
    const { dir, target } = fixture();
    const configPath = path.join(dir, 'settings.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        unknownSetting: true,
        rules: { 'MISSING-001': false },
        defaultFormatter: 'json',
        failOnWarning: true,
      }),
    );
    const onMessage = vi.fn();
    const result = await analyze(
      { targetPath: target, configPath },
      { rules: [rule()], onMessage },
    );
    expect(result.formatter).toBe('json');
    expect(result.exitCode).toBe(1);
    expect(result.messages.map((message) => message.kind)).toEqual([
      'config-warning',
      'config-warning',
    ]);
    expect(result.messages[0].message).toContain('unknownSetting');
    expect(result.messages[1].message).toContain('MISSING-001');
    expect(onMessage).toHaveBeenCalledTimes(2);
  });

  it('resolves custom rules relative to the explicit config and not the target', async () => {
    const { dir, target } = fixture('<mule><flow name="example"/></mule>');
    const configDir = path.join(dir, 'configuration');
    fs.mkdirSync(configDir);
    fs.writeFileSync(
      path.join(configDir, 'rules.yaml'),
      `rules:
  - id: CUSTOM-001
    name: Synthetic custom rule
    description: Characterization only
    category: standards
    severity: warning
    xpath: "//*[local-name()='flow']"
    message: Review flow
`,
    );
    const configPath = path.join(configDir, 'settings.json');
    fs.writeFileSync(configPath, JSON.stringify({ customRulesPath: 'rules.yaml' }));
    const result = await analyze({ targetPath: target, configPath }, { rules: [] });
    expect(result.contract.findings.map((finding) => finding.ruleId)).toEqual(['CUSTOM-001']);
  });

  it('applies quiet before baseline and gates the selected result', async () => {
    const { dir, target } = fixture();
    const baseline = await analyze({ targetPath: target }, { rules: [rule()] });
    const baselinePath = path.join(dir, 'baseline.json');
    fs.writeFileSync(baselinePath, formatJson(baseline.report));
    const result = await analyze(
      { targetPath: target, quiet: true, baselinePath, qualityGate: 'default' },
      { rules: [rule(), rule('error')] },
    );
    expect(result.contract.findings.map((finding) => finding.severity)).toEqual(['error']);
    expect(result.contract.selection.baseline).toEqual({ newIssues: 1, unchanged: 0, fixed: 1 });
    expect(result.contract.gate.status).toBe('failed');
    expect(result.exitCode).toBe(1);
  });

  it('keeps malformed execution failed under quiet, baseline and permissive gates', async () => {
    const { dir, target } = fixture('');
    const baselinePath = path.join(dir, 'baseline.json');
    fs.writeFileSync(baselinePath, '[]');
    const configPath = path.join(dir, 'settings.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ qualityGate: { name: 'Permissive', conditions: [] } }),
    );
    const result = await analyze(
      { targetPath: target, quiet: true, baselinePath, configPath, qualityGate: 'config' },
      { rules: [] },
    );
    expect(result.exitCode).toBe(3);
    expect(result.contract.execution.status).toBe('incomplete');
    expect(result.contract.gate.status).toBe('failed');
    expect(result.contract.findings[0].ruleId).toBe('PARSE-ERROR');
  });

  it('never equates an empty scan or throwing rule with a passed analysis', async () => {
    const { dir, target } = fixture();
    const empty = path.join(dir, 'empty');
    fs.mkdirSync(empty);
    const noFiles = await analyze({ targetPath: empty, qualityGate: 'default' }, { rules: [] });
    expect(noFiles.exitCode).toBe(2);
    expect(noFiles.contract.execution.status).toBe('no-files');
    const broken = rule();
    broken.validate = () => {
      throw new Error('Synthetic failure');
    };
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const failed = await analyze({ targetPath: target, quiet: true }, { rules: [broken] });
      expect(failed.exitCode).toBe(2);
      expect(failed.contract.execution.status).toBe('incomplete');
      expect(failed.contract.findings).toEqual([]);
    } finally {
      log.mockRestore();
    }
  });

  it('retains injected engine behavior but rejects silently ignored configuration', async () => {
    const { target } = fixture();
    const rules = [rule()];
    const engine = new LintEngine({ rules });
    const result = await analyze({ targetPath: target }, { engine });
    expect(result.contract.findings).toHaveLength(1);
    await expect(analyze({ targetPath: target, profile: 'strict' }, { engine })).rejects.toThrow(
      'supplied engine',
    );
  });

  it('keeps injected custom rules out of ratings after quiet and baseline selection', async () => {
    const { target, dir } = fixture();
    const custom = { ...rule('error'), isCustomRule: true, issueType: 'bug' as const };
    const engine = new LintEngine({ rules: [custom] });
    const baselinePath = path.join(dir, 'baseline.json');
    fs.writeFileSync(baselinePath, '[]');
    const result = await analyze({ targetPath: target, quiet: true, baselinePath }, { engine });
    expect(result.rules.map((entry) => entry.id)).toEqual([custom.id]);
    expect(result.contract.findings).toHaveLength(1);
    expect(result.report.metrics?.reliability?.bugs).toBe(0);
    await expect(analyze({ targetPath: target }, { engine, rules: [] })).rejects.toThrow(
      'supplied engine',
    );
  });

  it('characterizes default, profile and experimental selection without changing rule semantics', async () => {
    const { target, dir } = fixture();
    const stable = await analyze({ targetPath: target });
    expect(stable.rules.some((entry) => entry.category === 'experimental')).toBe(false);
    const experimental = await analyze({ targetPath: target, experimental: true });
    expect(experimental.rules.some((entry) => entry.category === 'experimental')).toBe(true);
    const configPath = path.join(dir, 'settings.json');
    fs.writeFileSync(configPath, JSON.stringify({ extends: 'mule-lint:baseline' }));
    const override = await analyze({ targetPath: target, configPath, profile: 'recommended' });
    expect(override.contract.scan.profile).toBe('recommended');
    const repeat = await analyze({ targetPath: target, profile: 'recommended' });
    expect(override.contract.findings).toEqual(repeat.contract.findings);
  });

  it('preserves legacy finding-only exit helper even when a gate was evaluated', async () => {
    const { dir, target } = fixture();
    const configPath = path.join(dir, 'settings.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ qualityGate: { name: 'Permissive', conditions: [] } }),
    );
    const result = await analyze(
      { targetPath: target, configPath, qualityGate: 'config' },
      { rules: [rule('error')] },
    );
    expect(result.exitCode).toBe(0);
    expect(getExitCode(result.report)).toBe(1);
  });

  it('rejects invalid format and missing explicit files before producing output', async () => {
    const { target, dir } = fixture();
    await expect(analyze({ targetPath: target, format: 'invalid' })).rejects.toThrow(
      'Unknown format',
    );
    await expect(
      analyze({ targetPath: target, configPath: path.join(dir, 'absent.json') }),
    ).rejects.toThrow('Config file not found');
    await expect(
      analyze({ targetPath: target, baselinePath: path.join(dir, 'absent.json') }, { rules: [] }),
    ).rejects.toThrow('Baseline file not found');
  });
});
