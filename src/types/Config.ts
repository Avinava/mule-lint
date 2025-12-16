import { RuleConfig } from './Rule';

/**
 * Formatter type for output
 */
export type FormatterType = 'table' | 'json' | 'sarif';

/**
 * Main configuration for mule-lint
 */
export interface LintConfig {
    /** Base configuration to extend */
    extends?: string | string[];

    /** Rule configurations keyed by rule ID */
    rules: Record<string, RuleConfig | boolean>;

    /** Glob patterns for files to include */
    include: string[];

    /** Glob patterns for files to exclude */
    exclude: string[];

    /** Path to custom rules directory */
    customRulesPath?: string;

    /** Default formatter for output */
    defaultFormatter: FormatterType;

    /** Fail on warnings (for CI/CD) */
    failOnWarning: boolean;

    /** Maximum number of issues before stopping */
    maxIssues?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: LintConfig = {
    rules: {},
    include: ['src/main/mule/**/*.xml'],
    exclude: [
        '**/test/**',
        '**/*.munit.xml',
        '**/target/**',
    ],
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
