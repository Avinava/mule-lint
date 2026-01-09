import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * ERR-001: Try Scope Best Practice
 *
 * Complex operations (DB calls, HTTP requests) should use Try scope
 * for granular error isolation and handling.
 */
export class TryScopeRule extends BaseRule {
    id = 'ERR-001';
    name = 'Try Scope Best Practice';
    description = 'Complex operations should use Try scope for error isolation';
    severity = 'info' as const;
    category = 'error-handling' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find flows with multiple risky operations
        const flows = this.select('//*[local-name()="flow"]', doc);

        for (const flow of flows) {
            const flowElement = flow as Element;
            const flowName = flowElement.getAttribute('name') || 'unnamed';

            // Count risky operations (DB, HTTP, external calls)
            const dbOperations = this.select(
                './/*[namespace-uri()="http://www.mulesoft.org/schema/mule/db"]',
                flow,
            );
            const httpRequests = this.select(
                './/*[local-name()="request" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
                flow,
            );
            const externalCalls = [...dbOperations, ...httpRequests];

            // Check if Try scope exists
            const tryScopes = this.select('.//*[local-name()="try"]', flow);

            // If multiple external calls but no Try scope
            if (externalCalls.length >= 2 && tryScopes.length === 0) {
                issues.push(
                    this.createIssue(
                        flow,
                        `Flow "${flowName}" has ${externalCalls.length} external calls without Try scope isolation`,
                        {
                            suggestion:
                                'Wrap risky operations in Try scope for granular error handling and isolation',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
