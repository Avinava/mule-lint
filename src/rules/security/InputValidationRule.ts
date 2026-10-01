import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-004: Input Validation Check
 *
 * A flow that starts at an `http:listener` and accepts a request body should
 * validate it. APIKit routers validate against the API spec themselves, so
 * flows that route through `apikit:router` are not reported. A flow that
 * delegates through `flow-ref` is skipped because the validation may live in
 * the referenced flow, which this per-file rule cannot see.
 */
export class InputValidationRule extends BaseRule {
  id = 'SEC-004';
  name = 'Input Validation';
  description = 'Incoming payloads should be validated with schema validation';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  private static readonly BODY_METHODS = ['POST', 'PUT', 'PATCH'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    for (const flow of this.select('//mule:flow', doc)) {
      const listeners = this.select(
        './*[local-name()="listener" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
        flow,
      );
      const listener = listeners[0] as Element | undefined;
      if (!listener || !this.acceptsBody(listener)) {
        continue;
      }
      if (this.select('.//apikit:router | .//mule:flow-ref', flow).length > 0) {
        continue;
      }
      if (this.hasValidation(flow)) {
        continue;
      }

      const flowName = this.getNameAttribute(flow) ?? 'unnamed';
      issues.push(
        this.createIssue(
          flow,
          `Flow "${flowName}" accepts a request body but has no input validation`,
          {
            suggestion:
              'Add validation:* operations, json:validate-schema, or xml-module:validate-schema before processing the payload',
          },
        ),
      );
    }

    return issues;
  }

  /** `allowedMethods` is a comma-separated list; absent means every method is accepted. */
  private acceptsBody(listener: Element): boolean {
    const allowed = listener.getAttribute('allowedMethods');
    if (!allowed || allowed.includes('${') || allowed.includes('#[')) {
      return true;
    }
    return allowed
      .split(',')
      .some((method) => InputValidationRule.BODY_METHODS.includes(method.trim().toUpperCase()));
  }

  private hasValidation(flow: Node): boolean {
    const schemaValidators = this.select(
      './/*[(local-name()="validate-schema" and (namespace-uri()="http://www.mulesoft.org/schema/mule/json" or namespace-uri()="http://www.mulesoft.org/schema/mule/xml-module"))]',
      flow,
    );
    if (schemaValidators.length > 0 || this.select('.//validation:*', flow).length > 0) {
      return true;
    }
    return this.select('.//ee:transform', flow).some((transform) =>
      /\bvalidate\w*\s*\(/i.test((transform as Element).textContent),
    );
  }
}
