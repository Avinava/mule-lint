import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HYG-001: Excessive Loggers
 *
 * Flows should not have too many loggers which can impact performance.
 */
export class ExcessiveLoggersRule extends BaseRule {
  id = 'HYG-001';
  name = 'Excessive Loggers';
  description = 'Flows should not have excessive loggers';
  severity = 'warning' as const;
  category = 'logging' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const maxLoggers = this.getOption(context, 'maxLoggers', 5);

    // Check flows
    const flows = this.select('//*[local-name()="flow"]', doc);

    for (const flow of flows) {
      const flowName = this.getNameAttribute(flow) ?? 'unknown';
      const loggerCount = this.count('.//*[local-name()="logger"]', flow);

      if (loggerCount > maxLoggers) {
        issues.push(
          this.createIssue(
            flow,
            `Flow "${flowName}" has ${loggerCount} loggers (max recommended: ${maxLoggers})`,
            {
              suggestion: 'Consider reducing loggers or moving detailed logging to DEBUG level',
            },
          ),
        );
      }
    }

    // Check sub-flows
    const subflows = this.select('//*[local-name()="sub-flow"]', doc);

    for (const subflow of subflows) {
      const subflowName = this.getNameAttribute(subflow) ?? 'unknown';
      const loggerCount = this.count('.//*[local-name()="logger"]', subflow);

      if (loggerCount > maxLoggers) {
        issues.push(
          this.createIssue(
            subflow,
            `Sub-flow "${subflowName}" has ${loggerCount} loggers (max recommended: ${maxLoggers})`,
            {
              suggestion: 'Consider reducing loggers or moving detailed logging to DEBUG level',
            },
          ),
        );
      }
    }

    return issues;
  }
}
