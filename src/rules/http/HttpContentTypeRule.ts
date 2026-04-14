import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-402: HTTP Request Content-Type
 *
 * POST/PUT HTTP requests should include Content-Type header.
 *
 * The rule detects Content-Type in three patterns:
 *
 * Pattern A — Static <http:header> element:
 *   <http:headers>
 *     <http:header headerName="Content-Type" value="application/json"/>
 *   </http:headers>
 *
 * Pattern B — CDATA DataWeave expression block:
 *   <http:headers><![CDATA[#[output application/java --- {"Content-Type": "application/json"}]]]></http:headers>
 *
 * Pattern C — Inline DataWeave expression on value attribute:
 *   <http:headers value='#[{"Content-Type": "application/json"}]'/>
 *
 * When headers are set via DataWeave (patterns B/C), the rule performs a
 * case-insensitive text search for "content-type" within the expression body.
 * If a DataWeave expression is present but does not contain "content-type",
 * the issue is downgraded to 'info' severity to acknowledge the static analysis
 * limitation of evaluating dynamic expressions.
 */
export class HttpContentTypeRule extends BaseRule {
  id = 'MULE-402';
  name = 'HTTP Request Content-Type';
  description = 'POST/PUT HTTP requests should include Content-Type header';
  severity = 'warning' as const;
  category = 'http' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find HTTP requests
    const httpRequests = this.select('//*[local-name()="request"]', doc);

    for (const request of httpRequests) {
      const nodeName = request.nodeName;
      if (!nodeName.includes('http:') && !nodeName.includes(':request')) {
        continue;
      }

      const method = this.getAttribute(request, 'method')?.toUpperCase();

      // Only check POST and PUT methods
      if (method === 'POST' || method === 'PUT') {
        const result = this.checkContentTypeHeader(request);

        if (result === 'missing') {
          const docName = this.getDocName(request) ?? 'HTTP Request';
          issues.push(
            this.createIssue(
              request,
              `${method} request "${docName}" is missing Content-Type header`,
              {
                suggestion:
                  'Add header: <http:header headerName="Content-Type" value="application/json"/>',
              },
            ),
          );
        } else if (result === 'dynamic-unverified') {
          // Headers are set via a DataWeave expression but we cannot statically
          // verify that Content-Type is included. Downgrade to info.
          const docName = this.getDocName(request) ?? 'HTTP Request';
          issues.push(
            this.createIssue(
              request,
              `${method} request "${docName}" sets headers via DataWeave expression — verify Content-Type is included`,
              {
                severity: 'info',
                suggestion:
                  'Ensure the DataWeave expression includes {"Content-Type": "application/json"} or equivalent',
              },
            ),
          );
        }
        // 'present' → no issue
      }
    }

    return issues;
  }

  /**
   * Check whether a Content-Type header is present on the given http:request element.
   *
   * @returns
   *   'present'            — Content-Type definitively found
   *   'dynamic-unverified' — headers set via DW expression but Content-Type not visible
   *   'missing'            — no headers element or no Content-Type anywhere
   */
  private checkContentTypeHeader(request: Node): 'present' | 'dynamic-unverified' | 'missing' {
    // Pattern A: Static <http:header headerName="Content-Type" ...>
    const staticHeaders = this.select('.//*[local-name()="header"]', request as Document);
    for (const header of staticHeaders) {
      const headerName = this.getAttribute(header, 'headerName') ?? '';
      if (headerName.toLowerCase() === 'content-type') {
        return 'present';
      }
    }

    // Patterns B & C: Check <http:headers> element for DataWeave expression content
    const headersElements = this.select('.//*[local-name()="headers"]', request as Document);
    let hasDynamicHeaders = false;

    for (const headersEl of headersElements) {
      const element = headersEl as Element;

      // Pattern C: value attribute containing a DataWeave expression
      const valueAttr = element.getAttribute('value') ?? '';
      if (valueAttr.includes('#[')) {
        hasDynamicHeaders = true;
        if (valueAttr.toLowerCase().includes('content-type')) {
          return 'present';
        }
      }

      // Pattern B: CDATA block or text content inside <http:headers>
      const textContent = headersEl.textContent ?? '';
      if (textContent.trim().length > 0) {
        // Any non-empty text content in <http:headers> is treated as a DW expression
        hasDynamicHeaders = true;
        if (textContent.toLowerCase().includes('content-type')) {
          return 'present';
        }
      }
    }

    return hasDynamicHeaders ? 'dynamic-unverified' : 'missing';
  }
}
