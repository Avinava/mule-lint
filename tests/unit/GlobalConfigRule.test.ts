import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GlobalConfigRule } from '../../src/rules/structure/StructureRules';
import { ValidationContext } from '../../src/types';

describe('GlobalConfigRule (MULE-803)', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mule803-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const context = (): ValidationContext => ({
    filePath: root,
    relativePath: '',
    projectRoot: root,
    config: { enabled: true },
  });

  function muleFile(name: string) {
    const dir = path.join(root, 'src/main/mule');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), '<mule/>');
  }

  it('reports a mule directory without a global file', () => {
    muleFile('orders.xml');
    const issues = new GlobalConfigRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('MULE-803');
    expect(issues[0]?.severity).toBe('warning');
  });

  it('passes with global.xml', () => {
    muleFile('global.xml');
    expect(new GlobalConfigRule().runProject(context())).toHaveLength(0);
  });

  it('accepts any xml file with global in its name, case-insensitively', () => {
    muleFile('Global-Config.xml');
    expect(new GlobalConfigRule().runProject(context())).toHaveLength(0);
  });

  it('does not accept non-xml files named global', () => {
    muleFile('global.properties');
    expect(new GlobalConfigRule().runProject(context())).toHaveLength(1);
  });

  it('skips projects without a src/main/mule directory', () => {
    expect(new GlobalConfigRule().runProject(context())).toHaveLength(0);
  });
});
