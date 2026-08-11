import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { getTextContent } from '../../core/XPathHelper';

/**
 * ERR-003: Error Response Structure
 *
 * Error responses should include both a correlationId and a message field
 * for effective debugging and traceability. Real-world accelerator projects
 * consistently use a JSON envelope like:
 *   { correlationId: "...", error: "...", message: "..." }
 *
 * This rule checks that ee:set-payload elements inside error handlers
 * contain both correlationId and message in their DataWeave body.
 */
export class ErrorResponseStructureRule extends BaseRule {
  id = 'ERR-003';
  name = 'Error Response Structure';
  description = 'Error responses should include correlationId and message fields';
  severity = 'info' as const;
  category = 'error-handling' as const;
  override issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find on-error blocks that contain ee:set-payload (i.e., they build an error response)
    const onErrorBlocks = [
      ...this.select('//mule:on-error-continue', doc),
      ...this.select('//mule:on-error-propagate', doc),
    ];

    for (const block of onErrorBlocks) {
      // Find ee:set-payload within this error block
      const setPayloads = this.select(
        './/*[local-name()="set-payload" and namespace-uri()="http://www.mulesoft.org/schema/mule/ee/core"]',
        block,
      );

      if (setPayloads.length === 0) {
        continue; // No payload transformation — skip (might be logging-only)
      }

      for (const sp of setPayloads) {
        const content = getTextContent(sp).toLowerCase();

        // Also check resource attribute — if present, we can't inspect inline
        const resourceAttr = this.getAttribute(sp, 'resource');
        if (resourceAttr) {
          continue; // External DWL — inspected by MULE-007 (CorrelationIdRule)
        }

        // Skip non-DataWeave content (e.g., static strings)
        if (!content.includes('dw 2.0') && !content.includes('---')) {
          continue;
        }

        const hasCorrelationId = content.includes('correlationid');
        const hasMessage = content.includes('message') || content.includes('detaileddescription');

        if (!hasCorrelationId && !hasMessage) {
          issues.push(
            this.createIssue(
              sp,
              'Error response payload is missing both correlationId and message fields',
              {
                suggestion:
                  'Include correlationId and message in the error response for traceability: { correlationId: vars.correlationId, message: error.detailedDescription }',
              },
            ),
          );
        } else if (!hasCorrelationId) {
          issues.push(
            this.createIssue(sp, 'Error response payload is missing correlationId field', {
              severity: 'info',
              suggestion:
                'Add correlationId to the error response: correlationId: vars.correlationId default ""',
            }),
          );
        } else if (!hasMessage) {
          issues.push(
            this.createIssue(
              sp,
              'Error response payload is missing a message or description field',
              {
                severity: 'info',
                suggestion: 'Add a message field: message: error.detailedDescription default ""',
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}
