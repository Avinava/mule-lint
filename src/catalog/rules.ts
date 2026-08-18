import { ALL_RULES } from '../rules';
import type { Rule } from '../types/Rule';
import { getRuleProfiles } from './profiles';
import { STANDARD_BY_CATEGORY } from './standards';
import type { RuleDefinition } from './types';

const docsRoot = 'https://avinava.github.io/mule-lint/best-practices/rules-catalog/';

export function createRuleDefinition(rule: Rule): RuleDefinition {
  const standard = STANDARD_BY_CATEGORY.get(rule.category);
  if (!standard) throw new Error(`No standard is registered for rule category: ${rule.category}`);

  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
    category: rule.category,
    issueType: rule.issueType ?? 'code-smell',
    status: rule.category === 'experimental' ? 'experimental' : 'stable',
    standardIds: [standard.id],
    profiles: getRuleProfiles(rule),
    docsUrl: rule.docsUrl ?? docsRoot,
    resourceUri: `mule-lint://rules/${rule.id}`,
  };
}

export const RULE_CATALOG: RuleDefinition[] = ALL_RULES.map(createRuleDefinition);

export function getRuleDefinition(id: string): RuleDefinition | undefined {
  return RULE_CATALOG.find((rule) => rule.id === id);
}
