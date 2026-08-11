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

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Check if this is an API (has APIKit router or HTTP listener)
    const hasApiKitRouter =
      context.projectContext?.hasApikitRouter ??
      this.exists(
        '//*[local-name()="router" and (contains(namespace-uri(), "/mule/apikit") or starts-with(name(), "apikit:"))]',
        doc,
      );
    const hasHttpListener =
      context.projectContext?.hasHttpListener ??
      this.exists('//*[local-name()="listener" and contains(namespace-uri(), "/mule/http")]', doc);

    if (!hasApiKitRouter && !hasHttpListener) {
      return issues; // Not an API, skip
    }

    // Check for auto-discovery configuration
    const hasAutoDiscoveryInDocument = this.exists(
      '//*[local-name()="api-autodiscovery" or local-name()="autodiscovery"]',
      doc,
    );
    const hasAutoDiscovery = context.projectContext?.hasAutoDiscovery ?? hasAutoDiscoveryInDocument;

    if (!hasAutoDiscovery && hasApiKitRouter) {
      issues.push(
        this.createFileIssue('API has no auto-discovery configuration for API Manager', {
          suggestion: 'Add <api-gateway:autodiscovery> for API Manager integration',
        }),
      );
    }

    // If auto-discovery exists, check it uses placeholders
    if (hasAutoDiscoveryInDocument) {
      const autodiscoveryNodes = this.select(
        '//*[local-name()="api-autodiscovery" or local-name()="autodiscovery"]',
        doc,
      );
      for (const node of autodiscoveryNodes) {
        const apiId = this.getAttribute(node, 'apiId');
        if (apiId && !apiId.includes('${')) {
          issues.push(
            this.createIssue(node, 'Auto-discovery apiId should use a property placeholder', {
              suggestion: 'Use apiId="${api.id}" instead of hardcoded value',
            }),
          );
        }
      }
    }

    return issues;
  }
}
