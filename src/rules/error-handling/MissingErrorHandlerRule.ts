import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-003: Missing Error Handler
 * 
 * Every flow should have an error handler (either inline or referenced).
 * Sub-flows do not need error handlers as they inherit from parent.
 */
export class MissingErrorHandlerRule extends BaseRule {
    id = 'MULE-003';
    name = 'Missing Error Handler';
    description = 'Flows should have an error handler for proper error management';
    severity = 'error' as const;
    category = 'error-handling' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get patterns to exclude (typically API main flows that use global handler)
        const excludePatterns = this.getOption<string[]>(context, 'excludePatterns', [
            '*-api-main',
            '*api-main*',
            '*-console',
        ]);

        // Find flows without error handlers
        // A flow can have either an inline error-handler or reference one via ref attribute
        const flows = this.select('//mule:flow', doc);

        for (const flow of flows) {
            const name = this.getNameAttribute(flow);
            if (!name) {
                continue;
            }

            // Skip excluded patterns
            if (this.isExcluded(name, excludePatterns)) {
                continue;
            }

            // Check for inline error-handler
            const hasInlineHandler = this.exists('mule:error-handler', flow);

            // Check for referenced error-handler (via ref attribute on flow)
            const hasRefHandler = this.hasAttribute(flow, 'error-handler-ref');

            if (!hasInlineHandler && !hasRefHandler) {
                issues.push(this.createIssue(
                    flow,
                    `Flow "${name}" is missing an error handler`,
                    {
                        suggestion: 'Add an <error-handler> element or use error-handler-ref to reference a global handler'
                    }
                ));
            }
        }

        return issues;
    }
}
