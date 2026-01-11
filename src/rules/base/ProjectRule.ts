import { Issue, RuleCategory, Severity, ValidationContext } from '../../types';
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

    /**
     * Track if this rule has already run during this scan
     * Reset by LintEngine at the start of each scan
     */
    private hasRun = false;

    /**
     * Override validate to implement run-once semantics
     */
    validate(doc: Document, context: ValidationContext): Issue[] {
        // Only run once per scan
        if (this.hasRun) {
            return [];
        }
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
}
