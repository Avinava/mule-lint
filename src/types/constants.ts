/**
 * Shared value lists. Types, config schemas, CLI validation, and MCP schemas
 * derive from these so a new value is added in one place.
 */

export const SEVERITIES = ['error', 'warning', 'info'] as const;

export const FORMATTER_TYPES = ['table', 'json', 'sarif', 'html', 'csv'] as const;

export const ISSUE_TYPES = ['code-smell', 'bug', 'vulnerability'] as const;

export const RATING_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
