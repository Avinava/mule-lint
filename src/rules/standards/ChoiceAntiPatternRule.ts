import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-008: Choice Anti-Pattern
 * 
 * Avoid using raise-error directly inside choice/otherwise blocks.
 * This is an anti-pattern - use a more descriptive error type instead.
 */
export class ChoiceAntiPatternRule extends BaseRule {
    id = 'MULE-008';
    name = 'Choice Anti-Pattern';
    description = 'Avoid raise-error directly in choice/otherwise - use descriptive error types';
    severity = 'warning' as const;
    category = 'standards' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find raise-error directly in otherwise blocks
        const raiseErrorsInOtherwise = this.select(
            '//mule:choice/mule:otherwise/mule:raise-error',
            doc
        );

        for (const raiseError of raiseErrorsInOtherwise) {
            // Skip if the raise-error is inside an until-successful block
            // This is a valid retry pattern where raise-error triggers the retry
            const isInsideUntilSuccessful = this.select(
                'ancestor::mule:until-successful',
                raiseError
            ).length > 0;

            if (isInsideUntilSuccessful) {
                continue; // Valid retry pattern, skip
            }

            const errorType = this.getAttribute(raiseError, 'type') ?? 'unknown';

            issues.push(this.createIssue(
                raiseError,
                `raise-error with type="${errorType}" directly in otherwise block is an anti-pattern`,
                {
                    suggestion: 'Consider using a custom error type (e.g., APP:INVALID_REQUEST) with descriptive message, or refactor the choice logic'
                }
            ));
        }

        // Also check for raise-error in when blocks (less common but still an anti-pattern)
        const raiseErrorsInWhen = this.select(
            '//mule:choice/mule:when/mule:raise-error',
            doc
        );

        for (const raiseError of raiseErrorsInWhen) {
            const errorType = this.getAttribute(raiseError, 'type') ?? 'unknown';

            // Check if using generic ANY type
            if (errorType === 'ANY' || errorType === 'MULE:ANY') {
                issues.push(this.createIssue(
                    raiseError,
                    `raise-error with generic type="${errorType}" in choice/when block`,
                    {
                        suggestion: 'Use a specific error type (e.g., APP:VALIDATION_ERROR) instead of ANY',
                        severity: 'info'
                    }
                ));
            }
        }

        return issues;
    }
}
