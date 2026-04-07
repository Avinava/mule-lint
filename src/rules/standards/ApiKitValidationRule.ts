import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * API-005: APIKit Validation
 *
 * APIs should use APIKit for auto-generated implementation interfaces.
 */
export class ApiKitValidationRule extends BaseRule {
  id = 'API-005';
  name = 'APIKit Validation';
  description = 'APIs should use APIKit for implementation interfaces';
  severity = 'info' as const;
  category = 'standards' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Check if this appears to be an API project (has HTTP listener)
    const hasHttpListener = this.exists('//*[local-name()="listener"]', doc);
    if (!hasHttpListener) {
      return issues;
    }

    // Check for APIKit router
    const hasApiKitRouter = this.exists('//*[local-name()="router"]', doc);
    const hasApiKitConfig = this.exists(
      '//*[local-name()="config" and contains(@name, "api")]',
      doc,
    );

    if (!hasApiKitRouter && !hasApiKitConfig) {
      // Only flag if this looks like an interface file
      const hasMainFlow = this.exists(
        '//*[local-name()="flow" and (contains(@name, "-main") or contains(@name, "-api"))]',
        doc,
      );
      if (hasMainFlow) {
        issues.push(
          this.createFileIssue(
            'Consider using APIKit to auto-generate the implementation interface',
            {
              suggestion: 'APIKit provides consistent API implementation patterns',
            },
          ),
        );
      }
    }

    return issues;
  }
}
