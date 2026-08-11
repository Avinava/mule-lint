import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HYG-005: Unused Variable
 *
 * Detects variables that are set in a flow but never referenced later
 * in the same flow. This is a common code smell that indicates dead code
 * or incomplete refactoring.
 *
 * Checks for set-variable elements whose variableName is not referenced
 * by any subsequent expression in the same flow via `vars.variableName`
 * or `#[vars.variableName]` patterns.
 *
 * Note: This is a best-effort heuristic — variables consumed outside the
 * flow (via flow-ref caller, for example) cannot be detected.
 */
export class UnusedVariableRule extends BaseRule {
  id = 'HYG-005';
  name = 'Unused Variable';
  description = 'Variables set in a flow should be referenced within the same flow';
  severity = 'info' as const;
  category = 'operations' as const;
  override issueType: IssueType = 'code-smell';

  /** Well-known variables that are always considered "used" (consumed by connectors/listeners) */
  private readonly WELL_KNOWN_VARS = new Set([
    'httpStatus',
    'outboundHeaders',
    'statusCode',
    'correlationId',
  ]);

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const flows = this.select('//mule:flow | //mule:sub-flow', doc);

    for (const flow of flows) {
      const flowName = this.getAttribute(flow, 'name') ?? '';

      // Collect all set-variable declarations in this flow
      const setVars = this.select('.//*[local-name()="set-variable"]', flow);
      const variables: Array<{ name: string; node: Node }> = [];

      for (const setVar of setVars) {
        const varName = this.getAttribute(setVar, 'variableName');
        if (varName && !this.WELL_KNOWN_VARS.has(varName)) {
          variables.push({ name: varName, node: setVar });
        }
      }

      if (variables.length === 0) {
        continue;
      }

      // Get the full text content of the flow to search for references
      const flowText = this.serializeNode(flow);

      for (const { name, node } of variables) {
        // Check for common reference patterns:
        // vars.name, vars['name'], vars["name"], vars.name
        const patterns = [`vars.${name}`, `vars['${name}']`, `vars["${name}"]`, `#[vars.${name}]`];

        const isReferenced = patterns.some((pattern) => {
          // Count occurrences — must appear beyond just the set-variable itself
          const regex = new RegExp(this.escapeRegex(pattern), 'g');
          const matches = flowText.match(regex);
          return matches !== null && matches.length > 0;
        });

        if (!isReferenced) {
          issues.push(
            this.createIssue(
              node,
              `Variable "${name}" is set in flow "${flowName}" but never referenced within the same flow`,
              {
                suggestion: `Remove the unused variable or verify it is consumed by a downstream flow via flow-ref`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private serializeNode(node: Node): string {
    // Get all text content and attribute values from the node subtree
    const parts: string[] = [];
    this.collectTextContent(node, parts);
    return parts.join(' ');
  }

  private collectTextContent(node: Node, parts: string[]): void {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      parts.push(node.textContent ?? '');
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      // Include attribute values (expressions live in attributes)
      const element = node as unknown as Element;
      for (const attribute of Array.from(element.attributes)) {
        parts.push(attribute.value);
      }
      // Recurse into children
      const children = node.childNodes;
      for (const child of Array.from(children)) {
        this.collectTextContent(child, parts);
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
