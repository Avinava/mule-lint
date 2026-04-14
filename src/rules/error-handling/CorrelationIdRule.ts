import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { getTextContent } from '../../core/XPathHelper';

/**
 * MULE-007: Correlation ID in Error Handler
 *
 * Error handlers should include correlation ID for traceability.
 * This helps track errors across distributed systems.
 *
 * The rule checks three patterns:
 * 1. Inline correlationId reference in the error handler XML text/attributes
 * 2. External DWL file referenced via resource="..." attribute on ee:set-payload
 *    (the DWL file content is read from disk and inspected)
 * 3. If a resource reference exists but the file cannot be read, the issue is
 *    downgraded to 'info' to avoid false positives on valid code
 */
export class CorrelationIdRule extends BaseRule {
  id = 'MULE-007';
  name = 'Correlation ID in Error Handler';
  description = 'Error handlers should reference correlationId for distributed tracing';
  severity = 'warning' as const;
  category = 'error-handling' as const;
  issueType: IssueType = 'bug';

  // Patterns that indicate correlation ID is being used
  private readonly CORRELATION_PATTERNS = [
    'correlationId',
    'correlation-id',
    'correlation_id',
    'x-correlation-id',
    'traceId',
    'trace-id',
    'requestId',
    'request-id',
  ];

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find error handlers
    const errorHandlers = this.select('//mule:error-handler', doc);

    for (const handler of errorHandlers) {
      const handlerName = this.getNameAttribute(handler);
      const parentFlow = this.findParentFlow(handler);
      const contextName = handlerName ?? parentFlow ?? 'unnamed';

      // Check inline text/attribute content first
      if (this.containsCorrelationId(handler)) {
        continue; // Found inline — pass
      }

      // Check resource= references to external DWL files
      const resourceResult = this.checkResourceReferences(handler, context.projectRoot);

      if (resourceResult === 'found') {
        continue; // Found in referenced DWL file — pass
      }

      if (resourceResult === 'unresolvable') {
        // Resource reference exists but file cannot be read; cannot determine
        // whether correlationId is present. Downgrade to info to avoid false positive.
        issues.push(
          this.createIssue(
            handler,
            `Error handler in "${contextName}" delegates to an external DWL file — verify correlationId is included`,
            {
              severity: 'info',
              suggestion:
                'Ensure the referenced DWL resource file includes correlationId in its output',
            },
          ),
        );
        continue;
      }

      // No correlationId found anywhere
      issues.push(
        this.createIssue(
          handler,
          `Error handler in "${contextName}" should include correlationId for traceability`,
          {
            suggestion:
              'Include correlationId in error response or logging for distributed tracing',
          },
        ),
      );
    }

    return issues;
  }

  /**
   * Inspect resource="..." attributes on ee:set-payload (and similar) elements
   * within the error handler.
   *
   * @returns
   *   'found'        — correlationId pattern detected in a referenced DWL file
   *   'unresolvable' — resource reference exists but could not be read
   *   'not-found'    — no resource references present or none contain correlationId
   */
  private checkResourceReferences(
    handler: Node,
    projectRoot: string,
  ): 'found' | 'unresolvable' | 'not-found' {
    // Look for any element with a resource= attribute (covers ee:set-payload, ee:set-variable, etc.)
    const elementsWithResource = this.select('.//*[@resource]', handler as Document);

    if (elementsWithResource.length === 0) {
      return 'not-found';
    }

    let hasUnresolvable = false;

    for (const el of elementsWithResource) {
      const resourceAttr = this.getAttribute(el, 'resource') ?? '';
      if (!resourceAttr) {
        continue;
      }

      // Resolve relative to src/main/resources/ (standard Mule resource path)
      const fullPath = path.join(projectRoot, 'src', 'main', 'resources', resourceAttr);

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (this.contentContainsCorrelationId(content)) {
          return 'found';
        }
        // File read successfully but no correlationId found — continue checking others
      } catch {
        // File not readable — mark as unresolvable but keep checking other resources
        hasUnresolvable = true;
      }
    }

    return hasUnresolvable ? 'unresolvable' : 'not-found';
  }

  /**
   * Check if a node or its descendants contain correlation ID reference
   */
  private containsCorrelationId(node: Node): boolean {
    const content = getTextContent(node).toLowerCase();

    for (const pattern of this.CORRELATION_PATTERNS) {
      if (content.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // Also check attributes
    const element = node as Element;
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attrValue = element.attributes[i].value.toLowerCase();
        for (const pattern of this.CORRELATION_PATTERNS) {
          if (attrValue.includes(pattern.toLowerCase())) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check whether a raw file content string contains a correlationId pattern
   */
  private contentContainsCorrelationId(content: string): boolean {
    const lower = content.toLowerCase();
    return this.CORRELATION_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
  }

  /**
   * Find the parent flow element for context
   */
  private findParentFlow(node: Node): string | null {
    let current: Node | null = node.parentNode;
    while (current) {
      if (current.nodeName === 'flow' || current.nodeName === 'mule:flow') {
        return this.getAttribute(current, 'name');
      }
      current = current.parentNode;
    }
    return null;
  }
}
