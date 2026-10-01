import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DwlStandardsRule } from '../../src/rules/standards/DwlStandardsRule';
import { ValidationContext } from '../../src/types';

describe('DwlStandardsRule (MULE-010)', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mule010-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function context(options?: Record<string, unknown>): ValidationContext {
    return {
      filePath: root,
      relativePath: '',
      projectRoot: root,
      config: { enabled: true, ...(options ? { options } : {}) },
    };
  }

  function touch(rel: string) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '%dw 2.0\n---\n{}');
  }

  it('reports both default files when missing', () => {
    const issues = new DwlStandardsRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('MULE-010');
    expect(issues[0]?.line).toBe(0);
    expect(issues[0]?.message).toContain('standard-error.dwl');
    expect(issues[0]?.message).toContain('common-functions.dwl');
  });

  it('reports only the missing file', () => {
    touch('src/main/resources/dwl/standard-error.dwl');
    const issues = new DwlStandardsRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).not.toContain('standard-error.dwl');
    expect(issues[0]?.message).toContain('common-functions.dwl');
  });

  it('passes when all default files exist', () => {
    touch('src/main/resources/dwl/standard-error.dwl');
    touch('src/main/resources/dwl/common-functions.dwl');
    expect(new DwlStandardsRule().runProject(context())).toHaveLength(0);
  });

  it('honours the expectedFiles option', () => {
    const opts = { expectedFiles: ['src/main/resources/dwl/custom.dwl'] };
    const issues = new DwlStandardsRule().runProject(context(opts));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('custom.dwl');
    touch('src/main/resources/dwl/custom.dwl');
    expect(new DwlStandardsRule().runProject(context(opts))).toHaveLength(0);
  });

  it('does not report with an empty expectedFiles list', () => {
    expect(new DwlStandardsRule().runProject(context({ expectedFiles: [] }))).toHaveLength(0);
  });
});
