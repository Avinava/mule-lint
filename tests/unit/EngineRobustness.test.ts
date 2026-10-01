import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LintEngine } from '../../src/engine/LintEngine';
import { BaseRule } from '../../src/rules/base/BaseRule';
import { Issue, ValidationContext } from '../../src/types';

class ThrowingRule extends BaseRule {
  id = 'TEST-999';
  name = 'Throws';
  description = 'Always throws';
  severity = 'info' as const;
  category = 'standards' as const;
  validate(_doc: Document, _context: ValidationContext): Issue[] {
    throw new Error('boom');
  }
  exposeExcluded(value: string, patterns: string[]) {
    return this.isExcluded(value, patterns);
  }
}

function makeProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-engine-'));
  fs.mkdirSync(path.join(root, 'src', 'main', 'mule'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src', 'main', 'mule', 'app.xml'),
    '<mule xmlns="http://www.mulesoft.org/schema/mule/core"><flow name="f"/></mule>',
  );
  return root;
}

describe('LintEngine robustness', () => {
  it('reports rule failures on the report instead of only on stderr', async () => {
    const root = makeProject();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const engine = new LintEngine({ rules: [new ThrowingRule()] });
      const report = await engine.scan(root);
      expect(report.ruleErrors?.[0]).toEqual({ ruleId: 'TEST-999', message: 'boom' });
      const again = await engine.scan(root);
      expect(again.ruleErrors).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('omits ruleErrors when every rule succeeds', async () => {
    const root = makeProject();
    try {
      const report = await new LintEngine({ rules: [] }).scan(root);
      expect(report.ruleErrors).toBeUndefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('serialises concurrent scans on one engine', async () => {
    const root = makeProject();
    try {
      const engine = new LintEngine({ rules: [] });
      const [a, b] = await Promise.all([engine.scan(root), engine.scan(root)]);
      expect(a.summary.totalFiles).toBe(b.summary.totalFiles);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('BaseRule.isExcluded', () => {
  const rule = new ThrowingRule();

  it('treats only * as a wildcard', () => {
    expect(rule.exposeExcluded('src/a.xml', ['src/*.xml'])).toBe(true);
    expect(rule.exposeExcluded('srcXa.xml', ['src.a.xml*'])).toBe(false);
    expect(rule.exposeExcluded('a(b', ['a(b*'])).toBe(true);
  });
});
