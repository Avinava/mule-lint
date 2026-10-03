import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Exercise the actual executable and MCP transport, including an installed package. */
export async function verifyContract(packageRoot) {
  const require = createRequire(path.join(packageRoot, 'package.json'));
  const { reportSchema } = require('./dist/src/core/ReportContract.js');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const root = mkdtempSync(path.join(os.tmpdir(), 'contract-'));
  const target = path.join(root, 'invalid.xml');
  writeFileSync(target, '');
  const empty = path.join(root, 'empty');
  mkdirSync(empty);
  const client = new Client({ name: 'contract-check', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageRoot, 'dist/bin/mule-lint-mcp.js')],
    stderr: 'pipe',
  });
  transport.stderr?.resume();
  try {
    for (const gate of [[], ['--quality-gate', 'default'], ['--quality-gate', 'strict']]) {
      const result = spawnSync(
        process.execPath,
        [
          path.join(packageRoot, 'dist/bin/mule-lint.js'),
          target,
          '-f',
          'report-json',
          '--verbose',
          ...gate,
        ],
        { encoding: 'utf8', timeout: 30000 },
      );
      assert.equal(result.status, 3, result.stderr);
      const report = reportSchema.parse(JSON.parse(result.stdout));
      assert.equal(report.execution.status, 'incomplete');
      assert.equal(report.summary.bySeverity.error, 1);
      assert.equal(report.gate.status, gate.length ? 'failed' : 'not-evaluated');
    }
    const legacy = spawnSync(
      process.execPath,
      [path.join(packageRoot, 'dist/bin/mule-lint.js'), target, '-f', 'json', '--verbose'],
      { encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(JSON.parse(legacy.stdout)[0].ruleId, 'PARSE-ERROR');
    const noFiles = spawnSync(
      process.execPath,
      [
        path.join(packageRoot, 'dist/bin/mule-lint.js'),
        empty,
        '-f',
        'json',
        '--quiet',
        '--quality-gate',
        'default',
      ],
      { encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(noFiles.status, 2, noFiles.stderr);
    assert.ok(Array.isArray(JSON.parse(noFiles.stdout)));
    assert.match(noFiles.stderr, /Analysis no-files:/);
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.find((tool) => tool.name === 'run_lint_analysis')?.outputSchema);
    for (const [projectPath, status] of [
      [target, 'incomplete'],
      [empty, 'no-files'],
    ]) {
      const result = await client.callTool({
        name: 'run_lint_analysis',
        arguments: { projectPath },
      });
      assert.equal(result.isError, true);
      assert.equal(reportSchema.parse(result.structuredContent).execution.status, status);
    }
    const failed = await client.callTool({
      name: 'run_lint_analysis',
      arguments: { projectPath: path.join(root, 'missing') },
    });
    assert.equal(failed.isError, true);
    assert.match(failed.content[0].text, /Analysis failed:/);
    const resource = await client.readResource({ uri: 'mule-lint://standards' });
    assert.ok(resource.contents.length);
  } finally {
    await client.close();
    await transport.close();
    rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await verifyContract(path.resolve(process.argv[2] ?? '.'));
  console.log('Executable contract checks passed.');
}
