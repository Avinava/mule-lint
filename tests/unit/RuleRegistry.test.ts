import * as fs from 'fs';
import * as path from 'path';
import { ALL_RULES } from '../../src/rules';
import {
  RULE_CATALOG,
  STANDARD_CATALOG,
  getRuleDefinition,
  getRuleProfiles,
} from '../../src/catalog';
import { LintEngine } from '../../src/engine/LintEngine';

describe('rule registry invariants', () => {
  it('contains exactly 98 unique, well-formed rules', () => {
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
        'api-design',
        'governance',
        'operations',
        'testing',
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

  it('publishes one structured definition and standard mapping per registered rule', () => {
    expect(RULE_CATALOG.map((rule) => rule.id)).toEqual(ALL_RULES.map((rule) => rule.id));
    expect(new Set(STANDARD_CATALOG.map((standard) => standard.category)).size).toBe(17);

    for (const rule of ALL_RULES) {
      const definition = getRuleDefinition(rule.id);
      expect(definition?.standardIds).toHaveLength(1);
      expect(definition?.profiles).toEqual(getRuleProfiles(rule));
      expect(definition?.resourceUri).toBe(`mule-lint://rules/${rule.id}`);
      expect(definition?.docsUrl).toMatch(/^https:\/\//);
    }
  });

  it('applies profiles and lets explicit rule configuration override membership', () => {
    const baseline = new LintEngine({
      rules: ALL_RULES,
      config: { extends: 'mule-lint:baseline' },
    });
    const expectedBaseline = ALL_RULES.filter((rule) => getRuleProfiles(rule).includes('baseline'));
    expect(baseline.getEnabledRules().map((rule) => rule.id)).toEqual(
      expectedBaseline.map((rule) => rule.id),
    );

    const recommended = new LintEngine({
      rules: ALL_RULES,
      config: { extends: 'mule-lint:recommended' },
    });
    const strict = new LintEngine({
      rules: ALL_RULES,
      config: { extends: 'mule-lint:strict' },
    });
    expect(baseline.getEnabledRules().length).toBeLessThan(recommended.getEnabledRules().length);
    expect(recommended.getEnabledRules().length).toBeLessThan(strict.getEnabledRules().length);

    const strictWithException = new LintEngine({
      rules: ALL_RULES,
      config: {
        extends: 'mule-lint:strict',
        rules: { 'EXP-001': true, 'MULE-001': false },
      },
    });
    expect(strictWithException.getEnabledRules().some((rule) => rule.id === 'EXP-001')).toBe(true);
    expect(strictWithException.getEnabledRules().some((rule) => rule.id === 'MULE-001')).toBe(
      false,
    );
  });
});
