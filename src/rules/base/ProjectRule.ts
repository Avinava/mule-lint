import * as path from 'path';
import { Severity, ValidationContext, Issue } from '../../types';
import { BaseRule } from './BaseRule';

/**
 * ProjectRule - Base class for rules that operate at project level
 *
 * Unlike regular rules that validate individual XML documents, ProjectRules
 * validate project-wide concerns like file existence, directory structure,
 * or configuration consistency across files.
 *
 * Key differences from BaseRule:
 * - Should only run once per scan (not once per file)
 * - Don't need the XML document to perform validation
 * - Return issues with line: 0 to indicate project-level issues
 *
 * Examples: MULE-001 (global error handler exists), YAML-001 (environment files),
 * DW-002 (DWL naming), DW-003 (common modules)
 */
export abstract class ProjectRule extends BaseRule {
  /**
   * Marker to identify this as a project-level rule
   */
  readonly isProjectRule = true;

  private hasRun = false;

  /**
   * Preserve direct validation compatibility for consumers and unit tests.
   * The engine guarantees once-per-scan execution through runProject().
   */
  validate(_doc: Document, context: ValidationContext): Issue[] {
    if (this.hasRun) {
      return [];
    }
    this.hasRun = true;
    return this.validateProject(context);
  }

  /**
   * Execute this rule through the engine's project phase without requiring a
   * synthetic XML document. The state reset preserves repeatable scans when a
   * LintEngine instance is reused.
   */
  runProject(context: ValidationContext): Issue[] {
    this.reset();
    this.hasRun = true;
    return this.validateProject(context);
  }

  /**
   * Reset the run state for a new scan
   */
  reset(): void {
    this.hasRun = false;
  }

  /**
   * Implement this method to validate project-level concerns
   * The XML document is not passed because project rules
   * typically don't need it
   */
  protected abstract validateProject(context: ValidationContext): Issue[];

  /**
   * Create a project-level issue (line 0 indicates project scope)
   */
  protected createProjectIssue(
    message: string,
    options?: { suggestion?: string; severity?: Severity },
  ): Issue {
    return {
      line: 0,
      message,
      ruleId: this.id,
      severity: options?.severity ?? this.severity,
      suggestion: options?.suggestion,
    };
  }

  /**
   * Create a project-level issue that points at a specific file.
   *
   * Project rules that inspect resources — property files, API specifications,
   * the POM — should use this so the finding is reported against the real file
   * and line rather than being collapsed into the synthetic project entry.
   * The engine groups these into their own file results.
   *
   * @param relativePath - Path relative to the project root
   * @param line - 1-indexed line within that file, or 0 when unknown
   */
  protected createLocatedIssue(
    relativePath: string,
    line: number,
    message: string,
    options?: { suggestion?: string; severity?: Severity; projectRoot?: string },
  ): Issue {
    const issue: Issue = {
      line,
      message,
      ruleId: this.id,
      severity: options?.severity ?? this.severity,
      suggestion: options?.suggestion,
      relativePath,
    };
    if (options?.projectRoot) {
      issue.filePath = path.join(options.projectRoot, relativePath);
    }
    return issue;
  }
}
