import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { vi } from 'vitest';
import { UnresolvedPropertyPlaceholderRule } from '../../src/rules/standards/UnresolvedPropertyPlaceholderRule';

/**
 * On Windows `path.join` of relative segments produces backslashes. Simulate
 * that for relative joins only, so file reads keep working on this host while
 * project-relative paths are built the way Windows builds them. `vi.mock` is
 * hoisted above the imports, so the rule and this file both see the mock; the
 * test's own joins start from an absolute directory and are unaffected.
 */
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  const join = (...segments: string[]): string =>
    actual.isAbsolute(segments[0] ?? '')
      ? actual.join(...segments)
      : actual.win32.join(...segments);
  return { ...actual, join, default: { ...actual, join } };
});

const MULE = 'http://www.mulesoft.org/schema/mule/core';

describe('CFG-004 on Windows-style paths', () => {
  let projectRoot: string;
  const write = (relativePath: string, content: string): void => {
    const target = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-windows-paths-'));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('simulates Windows relative joins', () => {
    expect(path.join('src/main/resources', 'config/dev.yaml')).toBe(
      'src\\main\\resources\\config\\dev.yaml',
    );
  });

  it('matches config/${mule.env}.yaml and reports with forward slashes', () => {
    write('src/main/resources/config/dev.yaml', 'only:\n  dev: "1"\n');
    write('src/main/resources/config/prod.yaml', 'other: "1"\n');
    write(
      'src/main/mule/app.xml',
      `<mule xmlns="${MULE}">\n<configuration-properties file="config/\${mule.env}.yaml" />\n<flow name="f"><logger message="\${only.dev}" /></flow>\n</mule>`,
    );
    const issues = new UnresolvedPropertyPlaceholderRule().runProject({
      filePath: path.join(projectRoot, 'pom.xml'),
      relativePath: 'Project Root',
      projectRoot,
      config: { enabled: true, options: {} },
    });
    expect(issues.map((issue) => issue.message)).toEqual([
      '"only.dev" is missing from src/main/resources/config/prod.yaml, so it does not resolve when mule.env=prod',
    ]);
  });
});
