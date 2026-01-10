import { Issue, Severity } from './Rule';

/**
 * Result for a single file scan
 */
export interface FileResult {
    /** Absolute path to the scanned file */
    filePath: string;
    /** Path relative to project root */
    relativePath: string;
    /** Issues found in this file */
    issues: Issue[];
    /** Whether the file was successfully parsed */
    parsed: boolean;
    /** Parse error message if parsing failed */
    parseError?: string;
}

/**
 * Summary statistics for a lint run
 */
export interface LintSummary {
    /** Total number of files scanned */
    totalFiles: number;
    /** Number of files with issues */
    filesWithIssues: number;
    /** Number of files that failed to parse */
    parseErrors: number;
    /** Count of issues by severity */
    bySeverity: Record<Severity, number>;
    /** Count of issues by rule ID */
    byRule: Record<string, number>;
}

/**
 * Project metrics collected during scan
 */
export interface ProjectMetrics {
    /** Total number of flows */
    flowCount: number;
    /** Total number of sub-flows */
    subFlowCount: number;
    /** Total number of DataWeave transforms */
    dwTransformCount: number;
    /** Total number of connector configurations */
    connectorConfigCount: number;
    /** Total number of HTTP listeners (services) */
    httpListenerCount: number;
    /** Complexity breakdown by file */
    fileComplexity: Record<string, 'simple' | 'medium' | 'complex'>;
}

/**
 * Complete report for a lint run
 */
export interface LintReport {
    /** Project root directory */
    projectRoot: string;
    /** When the lint run started */
    timestamp: string;
    /** Duration of the lint run in milliseconds */
    durationMs: number;
    /** Results for each file */
    files: FileResult[];
    /** Summary statistics */
    summary: LintSummary;
    /** Project metrics (optional for backward compatibility) */
    metrics?: ProjectMetrics;
}
