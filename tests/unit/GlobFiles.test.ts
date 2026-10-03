import fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { analyze } from '../../src/core/AnalysisService';
import globFiles from '../../src/core/GlobFiles';
import { scanDirectory, scanDirectorySync } from '../../src/core/FileScanner';

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'glob-contract-'));
  for (const file of [
    'a.xml',
    'b.raml',
    '.dot.xml',
    '.hidden/c.xml',
    'sub/c.xml',
    'sub/deep/d.xml',
    'target/e.xml',
    'x01.xml',
    'x02.xml',
    'x03.xml',
    'n1.xml',
    'n2.xml',
    'n3.xml',
    'literal[1].xml',
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '<mule/>');
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

// Expected sets were captured with the previous scanner; no vulnerable package
// is installed or executed by these regression tests.
describe('glob discovery compatibility', () => {
  it.each([
    ['sub', {}, []],
    [
      '**/*.{xml,raml}',
      { ignore: ['**/target/**', 'sub/**', '**/n*.xml', '**/x*.xml', 'literal*'] },
      ['a.xml', 'b.raml'],
    ],
    ['x{01..03}.xml', {}, ['x01.xml', 'x02.xml', 'x03.xml']],
    ['n{1..3..2}.xml', {}, ['n1.xml', 'n3.xml']],
    ['literal\\[1\\].xml', {}, ['literal[1].xml']],
    ['sub/**/!(d).xml', {}, ['sub/c.xml']],
    [['sub/**/*.xml', '!sub/deep/**'], {}, ['sub/c.xml']],
    ['sub/**/*.xml', { ignore: ['**/deep/**'] }, ['sub/c.xml']],
    ['**/*.xml', { deep: 1, ignore: ['n*.xml', 'x*.xml', 'literal*'] }, ['a.xml']],
    ['sub/**/*.xml', { deep: 1 }, ['sub/c.xml']],
    ['sub/**/*.xml', { deep: 2 }, ['sub/c.xml', 'sub/deep/d.xml']],
    [['**/missing.xml', 'sub/**/*.xml'], { deep: 1 }, []],
    ['sub/deep/d.xml', { deep: 0 }, ['sub/deep/d.xml']],
  ] as const)('preserves %s with %j', async (patterns, options, expected) => {
    const input = typeof patterns === 'string' ? patterns : [...patterns];
    const opts = {
      cwd: root,
      ...options,
      ...('ignore' in options ? { ignore: [...options.ignore] } : {}),
    };
    expect(globFiles.sync(input, opts)).toEqual(expected);
    expect(await globFiles(input, opts)).toEqual(expected);
  });

  it('keeps absolute results and de-duplicates overlapping patterns', async () => {
    const patterns = ['sub/**/*.xml', 'sub/c.xml'];
    const expected = ['sub/c.xml', 'sub/deep/d.xml'].map((file) => path.join(root, file));
    expect(await globFiles(patterns, { cwd: root, absolute: true })).toEqual(expected);
    expect(globFiles.sync(path.join(root, 'sub/*.xml'), { cwd: root })).toEqual([
      path.join(root, 'sub/c.xml'),
    ]);
  });

  it('retains explicit dotfile selection while wildcards skip hidden entries', () => {
    expect(globFiles.sync(['.dot.xml', '.hidden/*.xml'], { cwd: root })).toEqual([
      '.dot.xml',
      '.hidden/c.xml',
    ]);
    expect(globFiles.sync('**/*.xml', { cwd: root })).not.toContain('.dot.xml');
  });

  it('preserves symlink discovery and explicitly selected directory bases', () => {
    fs.symlinkSync('a.xml', path.join(root, 'link.xml'));
    fs.symlinkSync('sub', path.join(root, 'alias'));
    fs.symlinkSync('missing.xml', path.join(root, 'broken.xml'));
    const patterns = ['link.xml', 'alias/**/*.xml', 'broken.xml'];
    expect(globFiles.sync(patterns, { cwd: root, followSymbolicLinks: false })).toEqual([
      'alias/c.xml',
      'alias/deep/d.xml',
    ]);
    expect(globFiles.sync('**/*.xml', { cwd: root, followSymbolicLinks: false })).not.toContain(
      'alias/c.xml',
    );
    expect(globFiles.sync(patterns, { cwd: root, followSymbolicLinks: true })).toEqual([
      'alias/c.xml',
      'alias/deep/d.xml',
      'link.xml',
    ]);
  });

  it('keeps scanner default exclusions, depth, file sizes, and sync parity', async () => {
    const options = { include: ['sub/**/*.xml'], maxDepth: 1 };
    expect((await scanDirectory(root, options)).map((file) => file.relativePath)).toEqual([
      'sub/c.xml',
    ]);
    expect(await scanDirectory(root, options)).toEqual(scanDirectorySync(root, options));
    expect(scanDirectorySync(root).some((file) => file.relativePath.startsWith('target/'))).toBe(
      false,
    );
    expect(scanDirectorySync(path.join(root, 'a.xml'))[0]?.size).toBe(7);
  });

  it('propagates directory read failures through sync, async, and analysis scans', async () => {
    const denied = Object.assign(new Error('Synthetic directory access denied'), {
      code: 'EACCES',
    });
    vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw denied;
    });
    expect(() => globFiles.sync('**/*.xml', { cwd: root })).toThrow(denied);
    vi.spyOn(fs, 'readdir').mockImplementation((_directory, _options, callback) => {
      callback(denied, []);
    });
    await expect(globFiles('**/*.xml', { cwd: root })).rejects.toThrow(denied);
    await expect(analyze({ targetPath: root }, { rules: [] })).rejects.toThrow(denied);
  });

  it('rejects excessive expansion through analysis instead of reporting a complete empty scan', async () => {
    const configPath = path.join(root, 'settings.json');
    fs.writeFileSync(configPath, JSON.stringify({ include: ['file{1..999999999}.xml'] }));
    await expect(analyze({ targetPath: root, configPath }, { rules: [] })).rejects.toThrow(
      /expand to more than 1000/,
    );
  });

  it('scans a thousand files without losing entries to task grouping or limits', async () => {
    const expected: string[] = [];
    for (let directory = 0; directory < 20; directory++) {
      const folder = path.join(root, 'large', String(directory));
      fs.mkdirSync(folder, { recursive: true });
      for (let file = 0; file < 50; file++) {
        const relative = `large/${directory}/${file}.xml`;
        fs.writeFileSync(path.join(root, relative), '<mule/>');
        expected.push(relative);
      }
    }
    const options = { cwd: root, ignore: ['**/target/**'], followSymbolicLinks: false };
    expect(await globFiles('large/**/*.xml', options)).toEqual(expected.sort());
    expect(globFiles.sync('large/**/*.xml', options)).toEqual(expected);
  });

  it.each([
    '{'.repeat(4000) + 'x' + '}'.repeat(4000),
    '{a,b}'.repeat(20),
    'x{1..999999999}.xml',
    '('.repeat(64) + 'x' + ')'.repeat(64),
  ])('rejects oversized or deeply nested patterns without stack exhaustion', async (pattern) => {
    expect(() => globFiles.sync(pattern, { cwd: root })).toThrow(/Glob pattern/);
    await expect(globFiles(pattern, { cwd: root })).rejects.toThrow(/Glob pattern/);
  });
});
