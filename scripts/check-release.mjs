import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Run from the repository root; no dependencies or network access are needed.
const args = process.argv.slice(2);
assert.ok(
  args.length === 0 || (args.length === 2 && args[0] === '--tag'),
  'Usage: node scripts/check-release.mjs [--tag vX.Y.Z]',
);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.equal(lock.name, pkg.name, 'Lockfile package name must match package.json');
assert.equal(lock.packages?.['']?.name, pkg.name, 'Lockfile root name must match package.json');
assert.equal(lock.version, pkg.version, 'Lockfile version must match package.json');
assert.equal(
  lock.packages?.['']?.version,
  pkg.version,
  'Lockfile root version must match package.json',
);
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const latestVersion = changelog.match(
  /^## \[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\]|\s|$)/m,
)?.[1];
assert.equal(latestVersion, pkg.version, 'Newest changelog release must match package.json');
if (args.length) {
  assert.equal(args[1], `v${pkg.version}`, 'Release tag must exactly match package.json');
}
console.log(`Release metadata verified for ${pkg.version}.`);
