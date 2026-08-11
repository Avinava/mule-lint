import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * STD-001: APIKit Route Variable Consistency
 *
 * In APIKit projects, implementation flows (get:\resource:config, etc.)
 * should follow a consistent pattern for setting response variables.
 * For example, if some flows set httpStatus but others don't, this
 * inconsistency can lead to unexpected HTTP responses.
 *
 * This rule flags APIKit implementation flows that deviate from the
 * most common pattern in the file (e.g., if 4/5 flows set httpStatus
 * but one doesn't, the outlier is flagged).
 */
export class ApikitRouteVariableConsistencyRule extends BaseRule {
  id = 'STD-001';
  name = 'APIKit Route Variable Consistency';
  description =
    'APIKit implementation flows should follow consistent patterns for response variables';
  severity = 'info' as const;
  category = 'standards' as const;
  override issueType: IssueType = 'code-smell';

  /** Pattern for APIKit-generated flow names */
  private readonly APIKIT_FLOW_PATTERN = /^(get|post|put|patch|delete|head|options):\\/;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const flows = this.select('//mule:flow', doc);

    // Collect APIKit implementation flows
    const apikitFlows: Array<{ name: string; node: Node; setsHttpStatus: boolean }> = [];

    for (const flow of flows) {
      const flowName = this.getAttribute(flow, 'name') ?? '';
      if (!this.APIKIT_FLOW_PATTERN.test(flowName)) {
        continue;
      }

      const setsHttpStatus = this.exists(
        './/*[local-name()="set-variable" and @variableName="httpStatus"]',
        flow,
      );

      apikitFlows.push({ name: flowName, node: flow, setsHttpStatus });
    }

    // Need at least 3 flows to detect a meaningful pattern
    if (apikitFlows.length < 3) {
      return issues;
    }

    // Determine the majority pattern
    const withStatus = apikitFlows.filter((f) => f.setsHttpStatus).length;
    const withoutStatus = apikitFlows.length - withStatus;

    // Only flag if there's a clear majority (>60%) and at least one outlier
    if (withStatus > withoutStatus && withoutStatus > 0 && withStatus / apikitFlows.length > 0.6) {
      // Majority sets httpStatus — flag those that don't
      for (const flow of apikitFlows) {
        if (!flow.setsHttpStatus) {
          issues.push(
            this.createIssue(
              flow.node,
              `APIKit flow "${flow.name}" does not set httpStatus, but ${withStatus}/${apikitFlows.length} other flows do`,
              {
                suggestion:
                  'Add a set-variable for httpStatus to maintain consistency across all APIKit implementation flows',
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}
