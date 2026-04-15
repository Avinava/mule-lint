import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SF-002: Event Listener Null Guard
 *
 * Salesforce CDC (Change Data Capture) and Platform Event listeners receive
 * events where fields can be null (e.g., unchanged fields in CDC events
 * come through as null). Flows processing these events should include
 * null-safety checks to avoid NullPointerExceptions.
 *
 * This rule flags flows with Salesforce event listeners (subscribe-channel,
 * replay-channel) that contain DataWeave transforms accessing payload fields
 * without null-safety operators (?., default, !isEmpty, etc.).
 */
export class EventListenerNullGuardRule extends BaseRule {
  id = 'SF-002';
  name = 'Event Listener Null Guard';
  description =
    'Salesforce CDC/Platform Event listeners should include null-safety checks for event payload fields';
  severity = 'info' as const;
  category = 'operations' as const;
  issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const flows = this.select('//mule:flow', doc);

    for (const flow of flows) {
      const flowName = this.getAttribute(flow, 'name') ?? '';

      // Check if this flow has a Salesforce event source (CDC or Platform Event)
      const hasSfListener = this.exists(
        './/*[local-name()="subscribe-channel" or local-name()="replay-channel" or local-name()="subscribe-topic" or local-name()="replay-topic"]',
        flow,
      );

      if (!hasSfListener) {
        continue;
      }

      // Find DataWeave transforms in this flow
      const transforms = this.select('.//*[local-name()="transform"]', flow);

      for (const transform of transforms) {
        const transformText = transform.textContent ?? '';

        // Check if the transform accesses payload fields directly without null guards
        // Look for patterns like: payload.fieldName (without ?.)
        const hasDirectAccess = /payload\.\w+/.test(transformText);
        const hasNullSafety =
          /payload\?\.\w+/.test(transformText) ||
          /default\s/.test(transformText) ||
          /isEmpty/.test(transformText) ||
          /if\s*\(/.test(transformText) ||
          /unless/.test(transformText) ||
          /payload\s+default/.test(transformText);

        if (hasDirectAccess && !hasNullSafety) {
          issues.push(
            this.createIssue(
              transform,
              `DataWeave transform in CDC/event flow "${flowName}" accesses payload fields without null-safety checks`,
              {
                suggestion:
                  'Use null-safe navigation (payload?.field), default operators, or isEmpty checks when processing CDC event payloads — unchanged fields arrive as null',
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}
