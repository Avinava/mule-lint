import { Issue, Severity } from './Rule';
import type { QualityGateResult } from './QualityGate';

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
  parseError?: string | undefined;
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
 * Flow complexity information
 */
export interface FlowComplexityInfo {
  /** Flow name */
  flowName: string;
  /** File where flow is defined */
  file: string;
  /** Cyclomatic complexity score */
  complexity: number;
  /** Complexity rating */
  rating: 'low' | 'moderate' | 'high';
  /** Breakdown by decision type */
  breakdown: Record<string, number>;
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
  /** List of connector types found (e.g., http, db, salesforce) */
  connectorTypes: string[];
  /** Total error handlers (try scopes) */
  errorHandlerCount: number;
  /** Total choice routers (conditionals) */
  choiceRouterCount: number;
  /** API endpoints exposed by the project */
  apiEndpoints: Array<{ path: string; method: string }>;
  /** Environment configurations detected */
  environments: string[];
  /** Security patterns detected (OAuth, TLS, Secure Properties, etc.) */
  securityPatterns: string[];
  /** External service calls (outbound HTTP requests) */
  externalServices: Array<{ name: string; host: string }>;
  /** Scheduled jobs */
  schedulers: Array<{ type: 'cron' | 'fixed'; value: string; flow: string }>;
  /** Complexity breakdown by file */
  fileComplexity: Record<string, 'simple' | 'medium' | 'complex'>;
  /** Per-flow complexity data */
  flowComplexityData: FlowComplexityInfo[];

  // === Enhanced Metrics for Quality Gates ===

  /** Aggregated complexity metrics */
  complexity?: {
    /** Total complexity across all flows */
    total: number;
    /** Average complexity per flow */
    average: number;
    /** Highest complexity flow */
    highest?: { flow: string; value: number } | undefined;
    /** Overall rating based on complexity */
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
  };

  /** Maintainability metrics */
  maintainability?: {
    /** Technical debt in minutes */
    technicalDebtMinutes: number;
    /** Formatted debt (e.g., "2h 30m") */
    technicalDebt: string;
    /** Debt ratio as percentage */
    debtRatio: number;
    /** A-E rating */
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
  };

  /** Reliability metrics (bugs) */
  reliability?: {
    /** Number of bugs found */
    bugs: number;
    /** A-E rating */
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
  };

  /** Security metrics */
  security?: {
    /** Number of vulnerabilities */
    vulnerabilities: number;
    /** Number of security hotspots */
    hotspots: number;
    /** A-E rating */
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
  };

  /** Coverage metrics (from MUnit reports) */
  coverage?: {
    /** Number of MUnit tests */
    munitTests: number;
    /** Flows covered by tests */
    coveredFlows: number;
    /** Coverage percentage */
    percentage: number;
  };

  /** Duplication metrics */
  duplications?: {
    /** Percentage of duplicated code */
    percentage: number;
    /** Number of duplicate blocks */
    blocks: number;
  };
}

/**
 * Complete report for a lint run
 */
export interface RuleExecutionError {
  /** Rule that threw */
  ruleId: string;
  /** Error message */
  message: string;
}

export interface LintReport {
  /** Effective analysis scope; absent on reports produced by older callers. */
  scope?: {
    /** Scan target relative to project root; absent for legacy library reports. */
    target?: { kind: 'file' | 'project'; path: string };
    profile?: string | undefined;
    enabledRuleIds: string[];
    include: string[];
    exclude: string[];
  };
  /** Presentation selection, never used to hide execution failures. */
  selection?: {
    quiet: boolean;
    baseline?: { newIssues: number; unchanged: number; fixed: number };
  };
  /** Evaluated gate when requested by the caller. */
  gate?: QualityGateResult;
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
  metrics?: ProjectMetrics | undefined;
  /**
   * Rules that threw during the scan. The scan continues without them, so an
   * empty result from a listed rule is not a pass.
   */
  ruleErrors?: RuleExecutionError[] | undefined;
}
