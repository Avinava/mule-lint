import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-009: Generic Error Type
 *
 * Avoid catching type="ANY" in error handlers — unless it is the LAST
 * on-error block in the error-handler, where it serves as a catch-all
 * fallback (the accelerator pattern maps this to HTTP 500).
 *
 * Enhanced: only flag type="ANY" when it is NOT the last sibling in
 * its parent error-handler, since a catch-all as the final block is
 * an accepted MuleSoft best practice.
 */
export class GenericErrorRule extends BaseRule {
  id = 'MULE-009';
  name = 'Generic Error Type';
  description = 'Avoid catching type="ANY" - be specific about error types';
  severity = 'warning' as const;
  category = 'error-handling' as const;
  override issueType: IssueType = 'bug';

  // Generic types to flag
  private readonly GENERIC_TYPES = ['ANY', 'MULE:ANY'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find all on-error-continue and on-error-propagate with type attribute
    const allHandlers = [
      ...this.select('//mule:on-error-continue[@type]', doc).map((h) => ({
        node: h,
        type: 'on-error-continue',
      })),
      ...this.select('//mule:on-error-propagate[@type]', doc).map((h) => ({
        node: h,
        type: 'on-error-propagate',
      })),
    ];

    for (const handler of allHandlers) {
      this.checkGenericType(handler.node, handler.type, issues);
    }

    return issues;
  }

  /**
   * Check if handler uses generic error type.
   * Skip if this handler is the LAST on-error block in its parent
   * error-handler (catch-all fallback is an accepted pattern).
   */
  private checkGenericType(handler: Node, handlerType: string, issues: Issue[]): void {
    const errorType = this.getAttribute(handler, 'type');

    if (!errorType || !this.GENERIC_TYPES.includes(errorType.toUpperCase())) {
      return;
    }

    // Check if this is the last on-error sibling in its parent error-handler
    if (this.isLastOnErrorBlock(handler)) {
      return; // Catch-all as last block is fine
    }

    const docName = this.getDocName(handler);
    const displayName = docName ? `"${docName}"` : '';

    issues.push(
      this.createIssue(
        handler,
        `${handlerType} ${displayName} uses generic type="${errorType}" but is not the last error handler — move it to the end or use specific types`,
        {
          suggestion:
            'If this is a catch-all, place it as the last on-error block. Otherwise, catch specific error types (e.g., HTTP:CONNECTIVITY, DB:CONNECTIVITY)',
        },
      ),
    );
  }

  /**
   * Returns true if the given on-error node is the last on-error child
   * of its parent error-handler element.
   */
  private isLastOnErrorBlock(handler: Node): boolean {
    const parent = handler.parentNode;
    if (!parent) {
      return true; // No parent, can't determine position — assume last
    }

    // Collect on-error siblings (continue and propagate)
    const siblings = parent.childNodes;
    let lastOnError: Node | null = null;

    for (const sibling of Array.from(siblings)) {
      if (sibling.nodeType === 1 /* ELEMENT_NODE */) {
        const el = sibling as Element;
        const localName = el.localName;
        if (localName === 'on-error-continue' || localName === 'on-error-propagate') {
          lastOnError = sibling;
        }
      }
    }

    return lastOnError === handler;
  }
}
