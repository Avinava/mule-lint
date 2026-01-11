import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-003: Rate Limiting Policy Check
 *
 * Production APIs should have rate limiting or throttling configured
 * to prevent DoS attacks and manage API consumption.
 */
export class RateLimitingRule extends BaseRule {
    id = 'SEC-003';
    name = 'Rate Limiting Policy';
    description = 'APIs should have rate limiting or throttling configured';
    severity = 'warning' as const;
    category = 'security' as const;
    issueType: IssueType = 'vulnerability';

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Skip if not an API listener (interface.xml or similar)
        if (!context.relativePath.includes('interface') && !context.relativePath.includes('api')) {
            return issues;
        }

        // Find HTTP listeners
        const httpListeners = this.select(
            '//*[local-name()="listener" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
            doc,
        );

        if (httpListeners.length === 0) {
            return issues;
        }

        // Check for rate limiting policies (apikit-config, throttling-policy, etc.)
        const rateLimitingElements = this.select(
            '//*[contains(local-name(), "rate") or contains(local-name(), "throttl") or contains(local-name(), "spike")]',
            doc,
        );

        // Check for policy references in API Kit router
        const policyRefs = this.select(
            '//*[local-name()="policy" or contains(@policies, "rate") or contains(@policies, "throttl")]',
            doc,
        );

        // If no rate limiting found and this looks like an API
        if (rateLimitingElements.length === 0 && policyRefs.length === 0) {
            // Only report once per file, on the first listener
            issues.push(
                this.createIssue(
                    httpListeners[0],
                    'API endpoint has no rate limiting or throttling configured',
                    {
                        suggestion:
                            'Configure rate limiting via API Manager policies or add throttling:config to protect against DoS attacks',
                    },
                ),
            );
        }

        return issues;
    }
}
