import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * OPS-001: Auto-Discovery Configuration
 *
 * APIs should have auto-discovery configured for API Manager integration.
 */
export class AutoDiscoveryRule extends BaseRule {
    id = 'OPS-001';
    name = 'Auto-Discovery Configuration';
    description = 'APIs should have auto-discovery configured for API Manager';
    severity = 'info' as const;
    category = 'standards' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check if this is an API (has APIKit router or HTTP listener)
        const hasApiKitRouter = this.exists('//*[local-name()="router"]', doc);
        const hasHttpListener = this.exists('//*[local-name()="listener"]', doc);

        if (!hasApiKitRouter && !hasHttpListener) {
            return issues; // Not an API, skip
        }

        // Check for auto-discovery configuration
        const hasAutoDiscovery = this.exists('//*[local-name()="api-autodiscovery"]', doc);

        if (!hasAutoDiscovery && hasApiKitRouter) {
            issues.push(
                this.createFileIssue('API has no auto-discovery configuration for API Manager', {
                    suggestion: 'Add <api-gateway:autodiscovery> for API Manager integration',
                }),
            );
        }

        // If auto-discovery exists, check it uses placeholders
        if (hasAutoDiscovery) {
            const autodiscoveryNodes = this.select('//*[local-name()="api-autodiscovery"]', doc);
            for (const node of autodiscoveryNodes) {
                const apiId = this.getAttribute(node, 'apiId');
                if (apiId && !apiId.includes('${')) {
                    issues.push(
                        this.createIssue(
                            node,
                            'Auto-discovery apiId should use a property placeholder',
                            {
                                suggestion: 'Use apiId="${api.id}" instead of hardcoded value',
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}
