import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * API-007: APIKit httpStatus Variable
 *
 * APIKit implementation flows should set the httpStatus variable so the
 * HTTP listener can return the correct status code. The accelerator
 * pattern uses ee:set-variable with variableName="httpStatus" in both
 * success paths and error handlers.
 *
 * Common values: 200 (GET), 201 (POST/create), 204 (DELETE/no content)
 */
export class ApikitStatusCodeVariableRule extends BaseRule {
  id = 'API-007';
  name = 'APIKit Status Code Variable';
  description =
    'APIKit implementation flows should set httpStatus variable for correct response codes';
  severity = 'info' as const;
  category = 'api-led' as const;
  override issueType: IssueType = 'code-smell';

  /** Pattern that matches APIKit-generated flow names like get:\resource:config */
  private readonly APIKIT_FLOW_PATTERN = /^(get|post|put|patch|delete|head|options):\\/;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const flows = this.select('//mule:flow', doc);

    for (const flow of flows) {
      const flowName = this.getAttribute(flow, 'name') ?? '';

      // Only check APIKit implementation flows
      if (!this.APIKIT_FLOW_PATTERN.test(flowName)) {
        continue;
      }

      // Check if httpStatus is set anywhere in the flow
      const setsHttpStatus = this.exists(
        './/*[local-name()="set-variable" and @variableName="httpStatus"]',
        flow,
      );

      if (!setsHttpStatus) {
        // Determine expected status code from HTTP method
        const method = (flowName.split(':')[0] ?? '').toUpperCase();
        const expectedCode = this.getExpectedStatusCode(method);

        issues.push(
          this.createIssue(flow, `APIKit flow "${flowName}" does not set httpStatus variable`, {
            suggestion: `Add <set-variable variableName="httpStatus" value="${expectedCode}"/> for ${method} operations`,
          }),
        );
      }
    }

    return issues;
  }

  private getExpectedStatusCode(method: string): string {
    switch (method) {
      case 'POST':
        return '201';
      case 'DELETE':
        return '204';
      default:
        return '200';
    }
  }
}
