import { RuleConfig } from './Rule';
import { QualityGate } from './QualityGate';

/**
 * Formatter type for output
 */
export type FormatterType = 'table' | 'json' | 'sarif' | 'html' | 'csv';

/**
 * Main configuration for mule-lint
 */
export interface LintConfig {
  /** Built-in rule profile, for example "mule-lint:baseline". */
  extends?: string | string[];

  /** Rule configurations keyed by rule ID */
  rules: Partial<Record<string, RuleConfig | boolean>>;

  /** Glob patterns for files to include */
  include: string[];

  /** Glob patterns for files to exclude */
  exclude: string[];

  /**
   * Path to a YAML file of declarative XPath rules, resolved relative to this
   * configuration file. Library consumers may instead pass Rule instances
   * directly through EngineOptions.rules.
   */
  customRulesPath?: string;

  /** Default formatter for output */
  defaultFormatter: FormatterType;

  /** Fail on warnings (for CI/CD) */
  failOnWarning: boolean;

  /** Reserved for a future version; currently has no runtime effect. */
  maxIssues?: number;

  /** Quality gate configuration */
  qualityGate?: QualityGate;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: LintConfig = {
  rules: {},
  include: ['src/main/mule/**/*.xml'],
  exclude: ['**/test/**', '**/*.munit.xml', '**/target/**'],
  defaultFormatter: 'table',
  failOnWarning: false,
};

/**
 * CLI options passed from command line
 */
export interface CliOptions {
  /** Path to scan */
  path: string;
  /** Path to configuration file */
  config?: string;
  /** Output format */
  format?: FormatterType;
  /** Output file path */
  output?: string;
  /** Show only errors (no warnings/info) */
  quiet?: boolean;
  /** Fail on warnings */
  failOnWarning?: boolean;
  /** Verbose output */
  verbose?: boolean;
}
