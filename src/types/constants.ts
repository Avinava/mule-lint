/**
 * Shared value lists. Types, config schemas, CLI validation, and MCP schemas
 * derive from these so a new value is added in one place.
 */

export const SEVERITIES = ['error', 'warning', 'info'] as const;

export const FORMATTER_TYPES = [
  'table',
  'json',
  'sarif',
  'html',
  'csv',
  'markdown',
  'github',
  'junit',
] as const;

export const ISSUE_TYPES = ['code-smell', 'bug', 'vulnerability'] as const;

export const RULE_PROFILE_NAMES = ['baseline', 'recommended', 'strict'] as const;

export const QUALITY_METRICS = [
  'errors',
  'warnings',
  'infos',
  'complexity_max',
  'complexity_avg',
  'coverage',
  'duplications',
  'security_vulnerabilities',
  'security_hotspots',
  'technical_debt_ratio',
] as const;

export const QUALITY_OPERATORS = ['<', '>', '<=', '>=', '='] as const;

export const RATING_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
