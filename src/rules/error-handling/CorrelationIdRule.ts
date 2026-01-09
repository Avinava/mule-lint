import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { getTextContent } from '../../core/XPathHelper';

/**
 * MULE-007: Correlation ID in Error Handler
 *
 * Error handlers should include correlation ID for traceability.
 * This helps track errors across distributed systems.
 */
export class CorrelationIdRule extends BaseRule {
    id = 'MULE-007';
    name = 'Correlation ID in Error Handler';
    description = 'Error handlers should reference correlationId for distributed tracing';
    severity = 'warning' as const;
    category = 'error-handling' as const;

    // Patterns that indicate correlation ID is being used
    private readonly CORRELATION_PATTERNS = [
        'correlationId',
        'correlation-id',
        'correlation_id',
        'x-correlation-id',
        'traceId',
        'trace-id',
        'requestId',
        'request-id',
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find error handlers
        const errorHandlers = this.select('//mule:error-handler', doc);

        for (const handler of errorHandlers) {
            const handlerName = this.getNameAttribute(handler);
            const parentFlow = this.findParentFlow(handler);
            const contextName = handlerName ?? parentFlow ?? 'unnamed';

            // Check if any on-error block references correlation ID
            const hasCorrelationId = this.containsCorrelationId(handler);

            if (!hasCorrelationId) {
                issues.push(
                    this.createIssue(
                        handler,
                        `Error handler in "${contextName}" should include correlationId for traceability`,
                        {
                            suggestion:
                                'Include correlationId in error response or logging for distributed tracing',
                        },
                    ),
                );
            }
        }

        return issues;
    }

    /**
     * Check if a node or its descendants contain correlation ID reference
     */
    private containsCorrelationId(node: Node): boolean {
        const content = getTextContent(node).toLowerCase();

        for (const pattern of this.CORRELATION_PATTERNS) {
            if (content.includes(pattern.toLowerCase())) {
                return true;
            }
        }

        // Also check attributes
        const element = node as Element;
        if (element.attributes) {
            for (let i = 0; i < element.attributes.length; i++) {
                const attrValue = element.attributes[i].value.toLowerCase();
                for (const pattern of this.CORRELATION_PATTERNS) {
                    if (attrValue.includes(pattern.toLowerCase())) {
                        return true;
                    }
                }
            }
        }

        return false;
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
