import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-805: Oversized Sequential Flow
 *
 * A long straight-line flow is hard to read and to test even when its
 * cyclomatic complexity is low, so MULE-801 does not catch it: a 25-step flow
 * with no branching scores 1.
 *
 * Only direct children are counted. The message source and error handler are
 * excluded, and processors nested inside a scope are not counted recursively —
 * this metric is about the length of the top-level sequence, not total size.
 */
export class OversizedFlowRule extends BaseRule {
  id = 'MULE-805';
  name = 'Oversized Sequential Flow';
  description = 'Flows should not have an excessive number of sequential processors';
  severity = 'info' as const;
  category = 'complexity' as const;

  /** Elements that are not processors in the flow's sequence. */
  private static readonly NON_PROCESSORS = new Set(['error-handler', 'description', 'annotations']);

  /** Message-source elements that begin a flow rather than forming part of it. */
  private static readonly SOURCES = new Set([
    'listener',
    'scheduler',
    'inbound-endpoint',
    'poll',
    'on-new-or-updated-file',
    'on-table-row',
    'subscriber',
    'consume',
    'message-listener',
  ]);

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const threshold = this.getOption<number>(context, 'maxProcessors', 15);
    const includeSubflows = this.getOption<boolean>(context, 'includeSubflows', false);

    const selector = includeSubflows
      ? '//*[local-name()="flow" or local-name()="sub-flow"]'
      : '//*[local-name()="flow"]';

    for (const flow of this.select(selector, doc)) {
      const count = this.countProcessors(flow);
      if (count <= threshold) {
        continue;
      }

      const flowName = this.getNameAttribute(flow) ?? 'flow';
      issues.push(
        this.createIssue(
          flow,
          `Flow "${flowName}" has ${count} sequential processors (threshold ${threshold})`,
          {
            suggestion:
              'Extract cohesive groups of steps into named sub-flows that describe what they do, rather than splitting at the threshold',
          },
        ),
      );
    }

    return issues;
  }

  /**
   * Count direct processor children, excluding the message source and the
   * error handler. Scopes count once; their contents are not counted.
   */
  private countProcessors(flow: Node): number {
    let count = 0;
    let isFirstElement = true;

    for (const child of Array.from(flow.childNodes)) {
      if (child.nodeType !== 1) {
        continue;
      }

      const localName = (child as Element).localName;

      if (OversizedFlowRule.NON_PROCESSORS.has(localName)) {
        continue;
      }

      // A message source only counts as a source in the first position.
      if (isFirstElement && OversizedFlowRule.SOURCES.has(localName)) {
        isFirstElement = false;
        continue;
      }

      isFirstElement = false;
      count++;
    }

    return count;
  }
}
