import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-502: Async Without Error Handler
 *
 * Async scopes should have their own error handling.
 */
export class AsyncErrorHandlerRule extends BaseRule {
    id = 'MULE-502';
    name = 'Async Without Error Handler';
    description = 'Async scopes should have their own error handling';
    severity = 'warning' as const;
    category = 'performance' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const asyncScopes = this.select('//mule:async', doc);

        for (const async of asyncScopes) {
            // Check if async has error-handler or try scope
            const hasErrorHandling =
                this.exists('./mule:error-handler', async as Document) ||
                this.exists('./mule:try', async as Document);

            if (!hasErrorHandling) {
                const docName = this.getDocName(async) ?? 'Async scope';
                issues.push(
                    this.createIssue(
                        async,
                        `${docName} has no error handling - errors won't propagate to parent`,
                        {
                            suggestion: 'Add error-handler or wrap content in try scope',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
