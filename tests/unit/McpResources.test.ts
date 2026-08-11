import * as path from 'path';
import { resolveDocumentationPath } from '../../src/mcp/resources';

describe('MCP documentation resources', () => {
  it('resolves bundled documentation from the package tree', () => {
    const resolved = resolveDocumentationPath('docs/best-practices/rules-catalog.md');
    expect(resolved).toBeDefined();
    expect(path.basename(resolved!)).toBe('rules-catalog.md');
  });
});
