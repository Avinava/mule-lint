/**
 * Severity levels for lint issues
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Categories for organizing rules
 */
export type RuleCategory =
  | 'error-handling'
  | 'naming'
  | 'security'
  | 'logging'
  | 'http'
  | 'performance'
  | 'documentation'
  | 'standards'
  | 'complexity'
  | 'dataweave'
  | 'structure'
  | 'api-led'
  | 'governance'
  | 'operations'
  | 'experimental';

/**
 * Issue type classification for quality metrics
 * - code-smell: Maintainability issues (naming, style, complexity)
 * - bug: Reliability issues (missing error handlers, runtime failures)
 * - vulnerability: Security issues (hardcoded secrets, insecure configs)
 */
export type IssueType = 'code-smell' | 'bug' | 'vulnerability';

/**
 * Represents a single lint issue found during validation
 */
export interface Issue {
  /** Line number where the issue was found (1-indexed) */
  line: number;
  /** Column number where the issue was found (1-indexed, optional) */
  column?: number | undefined;
  /** Human-readable description of the issue */
  message: string;
  /** Rule ID that triggered this issue (e.g., "MULE-001") */
  ruleId: string;
  /** Severity of the issue */
  severity: Severity;
  /** Optional suggestion for fixing the issue */
  suggestion?: string | undefined;
  /** Optional code snippet showing the problematic code */
  codeSnippet?: string | undefined;
}

/**
 * Configuration for a specific rule
 */
export interface RuleConfig {
  /** Whether the rule is enabled */
  enabled: boolean;
  /** Override the default severity */
  severity?: Severity | undefined;
  /** Rule-specific options */
  options?: Record<string, unknown> | undefined;
}

/**
 * Detected project layer in MuleSoft API-led connectivity architecture.
 * Used to auto-adjust rule severity and enable/disable rules per layer.
 */
export type ProjectLayer = 'sapi' | 'papi' | 'eapi' | 'library' | 'batch' | 'unknown';

/**
 * Project-level context derived from a pre-scan of all files.
 * Populated by LintEngine before per-file rule execution.
 */
export interface ProjectContext {
  /** True if any file in the project contains an http:listener element */
  hasHttpListener: boolean;
  /** True if any file contains an apikit:router or apikit:console element */
  hasApikitRouter: boolean;
  /** True if any file contains an APIKit config element */
  hasApiKitConfig?: boolean | undefined;
  /** True if any file contains an API Manager autodiscovery element */
  hasAutoDiscovery?: boolean | undefined;
  /** Detected project layer based on naming conventions and content */
  projectLayer?: ProjectLayer | undefined;
}

/**
 * Context passed to each rule during validation
 */
export interface ValidationContext {
  /** Absolute path to the file being validated */
  filePath: string;
  /** Path relative to the project root */
  relativePath: string;
  /** Absolute path to the project root */
  projectRoot: string;
  /** Configuration for this specific rule */
  config: RuleConfig;
  /**
   * Set of all flow/sub-flow names referenced via <flow-ref> across all
   * project files.  Populated during the LintEngine pre-scan phase.
   * When undefined (e.g. standalone file scan), intra-file refs only.
   */
  allFlowRefs?: Set<string> | undefined;
  /**
   * Set of all flow/sub-flow names defined across all project files.
   * Populated during the LintEngine pre-scan phase.
   * Used by HYG-004 (FlowRefTargetExistsRule) for cross-file validation.
   */
  allFlowNames?: Set<string> | undefined;
  /**
   * Project-level feature flags derived from a pre-scan of all files.
   * Rules that only apply to HTTP-exposed projects (e.g. MULE-005) should
   * check these flags before reporting issues.
   */
  projectContext?: ProjectContext | undefined;
}

/**
 * Interface that all lint rules must implement
 */
export interface Rule {
  /** Unique identifier (e.g., "MULE-001") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of what the rule checks */
  description: string;
  /** Default severity level */
  severity: Severity;
  /** Category for grouping in reports */
  category: RuleCategory;
  /** Issue type for quality metrics (defaults to 'code-smell') */
  issueType?: IssueType | undefined;
  /** Optional URL to documentation */
  docsUrl?: string | undefined;
  /**
   * Validate a parsed XML document
   * @param doc - The parsed XML document
   * @param context - Validation context with file info and config
   * @returns Array of issues found
   */
  validate(doc: Document, context: ValidationContext): Issue[];
  /**
   * Optionally validate project-wide state once per directory scan.
   * Hybrid rules may implement both validate() and runProject().
   */
  runProject?(context: ValidationContext): Issue[];
}
