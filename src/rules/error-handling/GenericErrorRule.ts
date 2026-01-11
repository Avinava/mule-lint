import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-009: Generic Error Type
 *
 * Avoid catching type="ANY" in error handlers.
 * Be specific about error types to handle them appropriately.
 */
export class GenericErrorRule extends BaseRule {
    id = 'MULE-009';
    name = 'Generic Error Type';
    description = 'Avoid catching type="ANY" - be specific about error types';
    severity = 'warning' as const;
    category = 'error-handling' as const;
    issueType: IssueType = 'bug';

    // Generic types to flag
    private readonly GENERIC_TYPES = ['ANY', 'MULE:ANY'];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find on-error-continue with type="ANY"
        const onErrorContinue = this.select('//mule:on-error-continue[@type]', doc);

        for (const handler of onErrorContinue) {
            this.checkGenericType(handler, 'on-error-continue', issues);
        }

        // Find on-error-propagate with type="ANY"
        const onErrorPropagate = this.select('//mule:on-error-propagate[@type]', doc);

        for (const handler of onErrorPropagate) {
            this.checkGenericType(handler, 'on-error-propagate', issues);
        }

        return issues;
    }

    /**
     * Check if handler uses generic error type
     */
    private checkGenericType(handler: Node, handlerType: string, issues: Issue[]): void {
        const errorType = this.getAttribute(handler, 'type');

        if (errorType && this.GENERIC_TYPES.includes(errorType.toUpperCase())) {
            const docName = this.getDocName(handler);
            const displayName = docName ? `"${docName}"` : '';

            issues.push(
                this.createIssue(
                    handler,
                    `${handlerType} ${displayName} uses generic type="${errorType}"`,
                    {
                        suggestion:
                            'Catch specific error types (e.g., HTTP:CONNECTIVITY, DB:CONNECTIVITY, VALIDATION:INVALID_JSON) for better error handling',
                    },
                ),
            );
        }
    }
}
