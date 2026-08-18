import type { Rule } from '../types/Rule';
import { STANDARD_BY_CATEGORY } from './standards';
import type { RuleProfileDefinition, RuleProfileName, RuleProfileReference } from './types';

export const RULE_PROFILES = [
  {
    name: 'baseline',
    reference: 'mule-lint:baseline',
    description: 'High-confidence vendor, security, and correctness requirements.',
  },
  {
    name: 'recommended',
    reference: 'mule-lint:recommended',
    description: 'Stable vendor requirements and reviewed recommended practices.',
  },
  {
    name: 'strict',
    reference: 'mule-lint:strict',
    description: 'All stable rules, including opinionated conventions.',
  },
] as const satisfies readonly RuleProfileDefinition[];

const PROFILE_NAMES = new Set<RuleProfileName>(RULE_PROFILES.map((profile) => profile.name));

export function normalizeRuleProfile(value: string): RuleProfileName {
  const normalized = value.startsWith('mule-lint:') ? value.slice('mule-lint:'.length) : value;
  if (!PROFILE_NAMES.has(normalized as RuleProfileName)) {
    throw new Error(`Unknown mule-lint profile: ${value}. Use baseline, recommended, or strict.`);
  }
  return normalized as RuleProfileName;
}

export function toRuleProfileReference(profile: RuleProfileName): RuleProfileReference {
  return `mule-lint:${profile}`;
}

export function resolveRuleProfile(value: string | string[] | undefined): RuleProfileName {
  if (value === undefined) return 'recommended';
  const values = Array.isArray(value) ? value : [value];
  const profile = values.at(0);
  if (values.length !== 1 || profile === undefined) {
    throw new Error('mule-lint supports exactly one built-in profile in "extends".');
  }
  return normalizeRuleProfile(profile);
}

export function getRuleProfiles(rule: Rule): RuleProfileName[] {
  if (rule.category === 'experimental') return [];
  const standard = STANDARD_BY_CATEGORY.get(rule.category);
  const profiles: RuleProfileName[] = ['strict'];
  if (standard?.classification !== 'opinionated-convention') profiles.unshift('recommended');
  if (standard?.classification === 'vendor-requirement') profiles.unshift('baseline');
  return profiles;
}

export function isRuleEnabledInProfile(rule: Rule, profile: RuleProfileName): boolean {
  return getRuleProfiles(rule).includes(profile);
}
