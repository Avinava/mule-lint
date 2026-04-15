import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * ERR-002: Error Handler Type Coverage
 *
 * SAPI error handlers should cover the standard APIKit error types
 * (BAD_REQUEST, NOT_FOUND, METHOD_NOT_ALLOWED, NOT_ACCEPTABLE,
 * UNSUPPORTED_MEDIA_TYPE) when an APIKit router is present.
 *
 * Inspired by real-world accelerator patterns where both Salesforce and
 * NetSuite SAPIs consistently cover these types for proper HTTP status
 * code mapping.
 */
export class ErrorHandlerTypeCoverageRule extends BaseRule {
  id = 'ERR-002';
  name = 'Error Handler Type Coverage';
  description = 'Error handlers in APIKit projects should cover standard APIKit error types';
  severity = 'warning' as const;
  category = 'error-handling' as const;
  issueType: IssueType = 'bug';

  /**
   * Minimum set of APIKit error types that a well-structured SAPI should handle.
   * These correspond to standard HTTP status codes that APIKit can generate.
   */
  private readonly REQUIRED_APIKIT_TYPES = [
    'APIKIT:BAD_REQUEST',
    'APIKIT:NOT_FOUND',
    'APIKIT:METHOD_NOT_ALLOWED',
    'APIKIT:NOT_ACCEPTABLE',
    'APIKIT:UNSUPPORTED_MEDIA_TYPE',
  ];

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Only apply when project has an APIKit router
    if (context.projectContext && !context.projectContext.hasApikitRouter) {
      return issues;
    }

    // Find named (global) error handlers — these are the ones that should
    // have comprehensive coverage
    const errorHandlers = this.select('//mule:error-handler[@name]', doc);

    for (const handler of errorHandlers) {
      const handlerName = this.getAttribute(handler, 'name') ?? 'unnamed';

      // Collect all error types handled in this error-handler
      const handledTypes = new Set<string>();

      const onErrorBlocks = [
        ...this.select('.//mule:on-error-continue[@type]', handler as Document),
        ...this.select('.//mule:on-error-propagate[@type]', handler as Document),
      ];

      for (const block of onErrorBlocks) {
        const typeAttr = this.getAttribute(block, 'type') ?? '';
        // Types can be comma-separated (e.g., "SALESFORCE:CONNECTIVITY, HTTP:CONNECTIVITY")
        for (const t of typeAttr.split(',')) {
          handledTypes.add(t.trim().toUpperCase());
        }
      }

      // Check which required types are missing
      const missingTypes = this.REQUIRED_APIKIT_TYPES.filter((t) => !handledTypes.has(t));

      if (missingTypes.length > 0) {
        issues.push(
          this.createIssue(
            handler,
            `Error handler "${handlerName}" is missing coverage for: ${missingTypes.join(', ')}`,
            {
              suggestion:
                'Add on-error-propagate blocks for each APIKit error type to return correct HTTP status codes (400, 404, 405, 406, 415)',
            },
          ),
        );
      }
    }

    return issues;
  }
}
