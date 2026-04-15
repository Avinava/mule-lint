import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * ERR-004: Catch-All Must Be Last
 *
 * When type="ANY" (or no type attribute — implicit catch-all) is used in
 * an error handler, it must be the last on-error block. Placing a catch-all
 * before specific error types makes those specific handlers unreachable.
 *
 * Real-world pattern from accelerators: type="ANY" is always the final
 * on-error-propagate, typically mapping to HTTP 500.
 */
export class CatchAllLastRule extends BaseRule {
  id = 'ERR-004';
  name = 'Catch-All Must Be Last';
  description =
    'type="ANY" or implicit catch-all must be the last on-error block in an error handler';
  severity = 'error' as const;
  category = 'error-handling' as const;
  issueType: IssueType = 'bug';

  private readonly CATCH_ALL_TYPES = ['ANY', 'MULE:ANY'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const errorHandlers = this.select('//mule:error-handler', doc);

    for (const handler of errorHandlers) {
      // Collect all on-error-* children in document order
      const children = this.select(
        './*[local-name()="on-error-continue" or local-name()="on-error-propagate"]',
        handler as Document,
      );

      if (children.length <= 1) {
        continue; // Single handler — nothing to check
      }

      // Check each child except the last
      for (let i = 0; i < children.length - 1; i++) {
        const child = children[i];
        const typeAttr = this.getAttribute(child, 'type');

        const isCatchAll =
          typeAttr === null ||
          typeAttr === undefined ||
          typeAttr.trim() === '' ||
          this.CATCH_ALL_TYPES.includes(typeAttr.trim().toUpperCase());

        if (isCatchAll) {
          const handlerName =
            this.getAttribute(handler, 'name') ?? this.findParentFlowName(handler) ?? 'unnamed';
          const blockType = child.nodeName.includes('continue')
            ? 'on-error-continue'
            : 'on-error-propagate';

          issues.push(
            this.createIssue(
              child,
              `Catch-all ${blockType}${typeAttr ? ` (type="${typeAttr}")` : ''} is not the last handler in "${handlerName}" — subsequent handlers are unreachable`,
              {
                suggestion: 'Move the catch-all (type="ANY") block to be the last on-error handler',
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private findParentFlowName(node: Node): string | null {
    let current: Node | null = node.parentNode;
    while (current) {
      if (current.nodeName === 'flow' || current.nodeName === 'mule:flow') {
        return (current as Element).getAttribute('name');
      }
      current = current.parentNode;
    }
    return null;
  }
}
