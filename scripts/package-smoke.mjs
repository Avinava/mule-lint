import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectRoot = process.cwd();
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'mule-lint-package-'));

try {
  const packOutput = execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--silent', '--json', '--pack-destination', temporaryRoot],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_config_ignore_scripts: 'true' },
    },
  );
  const jsonStart = packOutput.indexOf('[');
  const jsonEnd = packOutput.lastIndexOf(']');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error(`npm pack did not return JSON: ${packOutput}`);
  }
  const packResults = JSON.parse(packOutput.slice(jsonStart, jsonEnd + 1));
  const filename = packResults[0]?.filename;
  if (!filename) {
    throw new Error('npm pack did not report an archive filename');
  }
  const archivePath = path.join(temporaryRoot, filename);
  const installRoot = path.join(temporaryRoot, 'install');
  mkdirSync(installRoot);
  writeFileSync(path.join(installRoot, 'package.json'), '{"private":true}');
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', archivePath], {
    cwd: installRoot,
    stdio: 'pipe',
  });

  const packageRoot = path.join(installRoot, 'node_modules/@sfdxy/mule-lint');
  const requireFromInstall = createRequire(path.join(installRoot, 'package.json'));
  const packageExports = requireFromInstall('@sfdxy/mule-lint');
  if (typeof packageExports.LintEngine !== 'function') {
    throw new Error('Installed CommonJS package does not export LintEngine');
  }
  if (typeof packageExports.formatXmlContent !== 'function') {
    throw new Error('Installed CommonJS package does not export formatXmlContent');
  }
  await packageExports.formatXmlContent('<mule/>');

  const installedPackage = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  const versionOutput = execFileSync(
    process.execPath,
    [path.join(packageRoot, installedPackage.bin['mule-lint']), '--version'],
    { encoding: 'utf8' },
  ).trim();
  if (versionOutput !== installedPackage.version) {
    throw new Error(
      `Installed CLI returned ${versionOutput}; expected ${installedPackage.version}`,
    );
  }

  const resources = requireFromInstall(path.join(packageRoot, 'dist/src/mcp/resources/index.js'));
  const originalCwd = process.cwd();
  process.chdir(installRoot);
  const bundledDoc = resources.resolveDocumentationPath('docs/best-practices/rules-catalog.md');
  process.chdir(originalCwd);
  if (!bundledDoc) {
    throw new Error('Installed MCP server cannot resolve bundled documentation');
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
