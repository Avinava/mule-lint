import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-005: HTTP Status in Error Handler
 *
 * Error handlers should set an httpStatus variable for proper API responses.
 * This ensures clients receive appropriate HTTP status codes.
 */
export class HttpStatusRule extends BaseRule {
    id = 'MULE-005';
    name = 'HTTP Status in Error Handler';
    description = 'Error handlers should set httpStatus variable for proper API response codes';
    severity = 'warning' as const;
    category = 'error-handling' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Variable name to look for
        const variableName = this.getOption(context, 'variableName', 'httpStatus');

        // Find error handlers
        const errorHandlers = this.select('//mule:error-handler', doc);

        for (const handler of errorHandlers) {
            // Get handler name or parent flow name for context
            const handlerName = this.getNameAttribute(handler);
            const parentFlow = this.findParentFlow(handler);
            const contextName = handlerName ?? parentFlow ?? 'unnamed';

            // Check if any on-error block sets the httpStatus variable
            const hasHttpStatus = this.exists(
                `.//mule:set-variable[@variableName="${variableName}"]`,
                handler,
            );

            if (!hasHttpStatus) {
                // Also check for ee:set-variable (DataWeave version)
                const hasEeHttpStatus = this.exists(
                    `.//ee:set-variable[@variableName="${variableName}"]`,
                    handler,
                );

                if (!hasEeHttpStatus) {
                    issues.push(
                        this.createIssue(
                            handler,
                            `Error handler in "${contextName}" should set "${variableName}" variable`,
                            {
                                suggestion: `Add <set-variable variableName="${variableName}" value="500"/> or use appropriate status based on error type`,
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }

    /**
     * Find the parent flow element for context
     */
    private findParentFlow(node: Node): string | null {
        let current: Node | null = node.parentNode;
        while (current) {
            if (current.nodeName === 'flow' || current.nodeName === 'mule:flow') {
                return this.getAttribute(current, 'name');
            }
            current = current.parentNode;
        }
        return null;
    }
}
