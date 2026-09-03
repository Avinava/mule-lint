import { z } from 'zod';
import { LintConfig } from '../types/Config';

const severitySchema = z.enum(['error', 'warning', 'info']);
const formatterSchema = z.enum(['table', 'json', 'sarif', 'html', 'csv']);
const qualityMetricSchema = z.enum([
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
]);

const ruleConfigSchema = z.object({
  enabled: z.boolean(),
  severity: severitySchema.optional(),
  options: z.record(z.unknown()).optional(),
});

const qualityGateSchema = z.object({
  name: z.string().min(1),
  conditions: z.array(
    z.object({
      metric: qualityMetricSchema,
      operator: z.enum(['<', '>', '<=', '>=', '=']),
      threshold: z.number().finite(),
      status: z.enum(['fail', 'warn']),
      onNewCode: z.boolean().optional(),
    }),
  ),
});

const lintConfigSchema = z
  .object({
    $schema: z.string().optional(),
    extends: z.union([z.string(), z.array(z.string())]).optional(),
    rules: z.record(z.union([z.boolean(), ruleConfigSchema])).optional(),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    customRulesPath: z.string().optional(),
    defaultFormatter: formatterSchema.optional(),
    failOnWarning: z.boolean().optional(),
    maxIssues: z.number().int().positive().optional(),
    qualityGate: qualityGateSchema.optional(),
  })
  .passthrough();

const SUPPORTED_KEYS = new Set([
  '$schema',
  'rules',
  'include',
  'exclude',
  'defaultFormatter',
  'failOnWarning',
  'qualityGate',
  'customRulesPath',
]);

const RESERVED_KEYS = new Set(['extends', 'maxIssues']);

export interface ParsedLintConfig {
  config: Partial<LintConfig>;
  warnings: string[];
}

/** Validate configuration while retaining forward-compatible unknown keys. */
export function parseLintConfig(value: unknown): ParsedLintConfig {
  const result = lintConfigSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid mule-lint configuration: ${details}`);
  }

  const warnings: string[] = [];
  for (const key of Object.keys(result.data)) {
    if (RESERVED_KEYS.has(key)) {
      warnings.push(`Configuration key "${key}" is reserved and has no effect in mule-lint 1.x.`);
    } else if (!SUPPORTED_KEYS.has(key)) {
      warnings.push(`Unknown configuration key "${key}" was ignored.`);
    }
  }

  result.data.qualityGate?.conditions.forEach((condition, index) => {
    if (condition.onNewCode === true) {
      warnings.push(
        `Configuration key "qualityGate.conditions.${index}.onNewCode" is reserved and has no effect in mule-lint 1.x.`,
      );
    }
  });

  const config = Object.fromEntries(
    Object.entries(result.data).filter(
      ([key]) => key !== '$schema' && (SUPPORTED_KEYS.has(key) || RESERVED_KEYS.has(key)),
    ),
  );
  return { config, warnings };
}
