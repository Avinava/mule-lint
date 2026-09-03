import * as fs from 'fs';
import * as path from 'path';
import { ALL_RULES } from '../../src/rules';

describe('rule registry invariants', () => {
  it('contains exactly 82 unique, well-formed rules', () => {
    const ids = ALL_RULES.map((rule) => rule.id);
    expect(ids).toHaveLength(98);
    expect(new Set(ids).size).toBe(ids.length);

    for (const rule of ALL_RULES) {
      expect(rule.id).toMatch(/^[A-Z]+-\d{3}$/);
      expect(rule.name.trim()).not.toBe('');
      expect(rule.description.trim()).not.toBe('');
      expect(['error', 'warning', 'info']).toContain(rule.severity);
      expect([
        'error-handling',
        'naming',
        'security',
        'logging',
        'http',
        'performance',
        'documentation',
        'standards',
        'complexity',
        'dataweave',
        'structure',
        'api-led',
        'governance',
        'operations',
        'experimental',
      ]).toContain(rule.category);
    }
  });

  it('matches the documented catalog exactly', () => {
    const catalog = fs.readFileSync(path.resolve('docs/best-practices/rules-catalog.md'), 'utf8');
    const documentedIds = new Set(
      [...catalog.matchAll(/^### ([A-Z]+-\d{3}):/gm)].map((match) => match[1]),
    );
    expect([...documentedIds].sort()).toEqual(ALL_RULES.map((rule) => rule.id).sort());
  });
});
