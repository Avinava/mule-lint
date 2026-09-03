import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * LOG-005: Flow Logging Present
 *
 * A flow with no logger leaves no trace in the log when it runs, which makes an
 * incident hard to reconstruct.
 *
 * Sub-flows are excluded by default: they are reusable units, and requiring a
 * logger in each one produces noise rather than insight. Both the core logger
 * and JSON logger connectors count as evidence.
 *
 * APIKit generates `*-main` and `*-console` router flows that contain no
 * business logic; they are excluded by default for the same reason MULE-002 and
 * MULE-003 exclude them.
 */
export class FlowLoggingRule extends BaseRule {
  id = 'LOG-005';
  name = 'Flow Logging Present';
  description = 'Flows should contain at least one logger';
  severity = 'warning' as const;
  category = 'logging' as const;

  /** APIKit-generated router flows, which hold no business logic. */
  private static readonly DEFAULT_EXCLUDES = ['*-main', '*-console'];

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const includeSubflows = this.getOption<boolean>(context, 'includeSubflows', false);
    const excludePatterns = this.getOption<string[]>(
      context,
      'excludePatterns',
      FlowLoggingRule.DEFAULT_EXCLUDES,
    );

    const selector = includeSubflows
      ? '//*[local-name()="flow" or local-name()="sub-flow"]'
      : '//*[local-name()="flow"]';

    for (const flow of this.select(selector, doc)) {
      const flowName = this.getNameAttribute(flow) ?? '';

      if (excludePatterns.length > 0 && this.isExcluded(flowName, excludePatterns)) {
        continue;
      }

      if (this.hasLogger(flow)) {
        continue;
      }

      const label = (flow as Element).localName === 'sub-flow' ? 'Sub-flow' : 'Flow';
      issues.push(
        this.createIssue(flow, `${label} "${flowName}" contains no logger`, {
          suggestion:
            'Add a logger recording the business event and correlation id, so the execution can be traced',
        }),
      );
    }

    return issues;
  }

  /** True when the flow contains a core logger or a JSON logger component. */
  private hasLogger(flow: Node): boolean {
    if (this.exists('.//*[local-name()="logger"]', flow)) {
      return true;
    }
    return this.exists(
      './/*[contains(local-name(), "json-logger") or contains(local-name(), "jsonlogger")]',
      flow,
    );
  }
}
