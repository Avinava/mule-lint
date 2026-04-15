import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * DW-005: Duplicate Transform Logic
 *
 * Flags flows that contain multiple DataWeave transform-message blocks
 * with identical or near-identical body content. Duplicated transforms
 * should be extracted into reusable .dwl modules under src/main/resources/dw/.
 *
 * This rule checks for duplicate ee:transform → ee:message → ee:set-payload
 * content within the same file. It compares the text content of set-payload
 * elements and flags exact duplicates.
 */
export class DuplicateTransformLogicRule extends BaseRule {
  id = 'DW-005';
  name = 'Duplicate Transform Logic';
  description =
    'Duplicate DataWeave transform blocks should be extracted into reusable .dwl modules';
  severity = 'info' as const;
  category = 'dataweave' as const;
  issueType: IssueType = 'code-smell';

  /** Minimum length of transform content to consider for duplication check */
  private readonly MIN_CONTENT_LENGTH = 20;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find all ee:transform → ee:set-payload elements
    const transforms = this.select(
      '//*[local-name()="transform"]/*[local-name()="message"]/*[local-name()="set-payload"]',
      doc,
    );

    // Also check top-level set-payload in transforms without message wrapper
    const directTransforms = this.select(
      '//*[local-name()="transform"]/*[local-name()="set-payload"]',
      doc,
    );

    const allPayloads = [...transforms, ...directTransforms];

    // Collect transform content for duplication detection
    const contentMap = new Map<string, Node[]>();

    for (const payload of allPayloads) {
      const content = (payload.textContent ?? '').trim();

      // Skip short/trivial transforms and resource references
      if (content.length < this.MIN_CONTENT_LENGTH) {
        continue;
      }
      if (content.startsWith('${') || content.includes('readUrl')) {
        continue; // Already using externalized DWL
      }

      const normalized = content.replace(/\s+/g, ' ');
      const nodes = contentMap.get(normalized) ?? [];
      nodes.push(payload);
      contentMap.set(normalized, nodes);
    }

    // Flag duplicates
    for (const [, nodes] of contentMap) {
      if (nodes.length > 1) {
        // Only flag the second and subsequent occurrences
        for (let i = 1; i < nodes.length; i++) {
          issues.push(
            this.createIssue(
              nodes[i],
              `Duplicate DataWeave transform logic found (${nodes.length} identical blocks in file)`,
              {
                suggestion:
                  'Extract the shared DataWeave logic into a reusable .dwl file under src/main/resources/dw/ and reference it with readUrl("classpath://dw/transform.dwl")',
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}
