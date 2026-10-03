import * as path from 'path';
import fs from 'node:fs';
import os from 'node:os';
import { resolveDocumentationPath } from '../../src/mcp/resources';

describe('MCP documentation resources', () => {
  it('resolves bundled documentation from the package tree', () => {
    const resolved = resolveDocumentationPath('docs/best-practices/rules-catalog.md');
    expect(resolved).toBeDefined();
    expect(path.basename(resolved!)).toBe('rules-catalog.md');
  });
  it('does not let an unrelated working directory shadow canonical package documentation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'documentation-decoy-'));
    const relative = 'docs/best-practices/rules-catalog.md';
    const decoy = path.join(root, relative);
    fs.mkdirSync(path.dirname(decoy), { recursive: true });
    fs.writeFileSync(decoy, 'Untrusted replacement');
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
    try {
      const resolved = resolveDocumentationPath(relative);
      expect(resolved).toBeDefined();
      expect(resolved).not.toBe(decoy);
      expect(resolveDocumentationPath('docs/missing-document.md')).toBeUndefined();
      expect(resolveDocumentationPath('../../package.json')).toBeUndefined();
      expect(resolveDocumentationPath(decoy)).toBeUndefined();
    } finally {
      cwd.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
