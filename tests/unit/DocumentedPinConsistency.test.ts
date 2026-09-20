import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PIN_RE = /@sfdxy\/mule-lint@(\d+\.\d+\.\d+)/g;

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

describe('documented pin consistency', () => {
  it('keeps every @sfdxy/mule-lint@x.y.z pin equal to package.json.version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      version: string;
    };
    const files = [path.join(ROOT, 'README.md'), ...walkMarkdown(path.join(ROOT, 'docs'))];
    const drifts: string[] = [];

    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(PIN_RE)) {
        const pinned = match[1];
        if (pinned !== pkg.version) {
          const rel = path.relative(ROOT, file);
          drifts.push(`${rel}: @sfdxy/mule-lint@${pinned} (expected ${pkg.version})`);
        }
      }
    }

    expect(drifts).toEqual([]);
  });
});
