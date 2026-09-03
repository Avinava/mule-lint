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
 */
export class FlowLoggingRule extends BaseRule {
  id = 'LOG-005';
  name = 'Flow Logging Present';
  description = 'Flows should contain at least one logger';
  severity = 'warning' as const;
  category = 'logging' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const includeSubflows = this.getOption<boolean>(context, 'includeSubflows', false);
    const excludePatterns = this.getOption<string[]>(context, 'excludePatterns', []);

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

      const localName = (flow as Element).localName;
      issues.push(
        this.createIssue(flow, `${localName} "${flowName}" contains no logger`, {
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
