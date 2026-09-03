import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * OPS-004: Scheduler Mode
 *
 * A fixed-frequency scheduler drifts relative to wall-clock time and restarts
 * its interval on redeploy, so a job that must run at a particular time of day
 * is usually better expressed as a CRON expression.
 *
 * Fixed frequency is not intrinsically wrong — it is the right choice for
 * polling. This rule reports a deviation from a configured project policy, and
 * says so. OPS-003 separately requires that a CRON expression be externalized.
 */
export class SchedulerModeRule extends BaseRule {
  id = 'OPS-004';
  name = 'Scheduler Mode';
  description = 'Schedulers should use the mode preferred by project policy';
  severity = 'info' as const;
  category = 'operations' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const preferredMode = this.getOption<string>(context, 'preferredMode', 'cron');
    if (preferredMode !== 'cron') {
      return [];
    }

    const excludePatterns = this.getOption<string[]>(context, 'excludePatterns', []);
    if (excludePatterns.length > 0 && this.isExcluded(context.relativePath, excludePatterns)) {
      return [];
    }

    const excludeFlows = this.getOption<string[]>(context, 'excludeFlows', []);
    const issues: Issue[] = [];

    for (const fixedFrequency of this.select('//*[local-name()="fixed-frequency"]', doc)) {
      const flowName = this.getEnclosingFlowName(fixedFrequency);

      if (excludeFlows.length > 0 && this.isExcluded(flowName, excludeFlows)) {
        continue;
      }

      issues.push(
        this.createIssue(
          fixedFrequency,
          `Scheduler${flowName ? ` in flow "${flowName}"` : ''} uses fixed-frequency, but project policy prefers CRON`,
          {
            suggestion:
              'Use <cron expression="${scheduler.cron}" timeZone="${scheduler.timezone}"/>, or set preferredMode to "any" when polling is intended',
          },
        ),
      );
    }

    return issues;
  }

  private getEnclosingFlowName(node: Node): string {
    let current: Node | null = node.parentNode;
    while (current) {
      const localName = (current as Element).localName;
      if (localName === 'flow' || localName === 'sub-flow') {
        return (current as Element).getAttribute('name') ?? '';
      }
      current = current.parentNode;
    }
    return '';
  }
}
