import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HTTP-005: Listener Response Content Type
 *
 * An HTTP listener response should make its content type visible, through a
 * header, a mimeType attribute, or a DataWeave output directive. A client that
 * cannot tell JSON from text has to guess.
 *
 * MULE-402 remains responsible for outbound request content type. A response
 * whose headers are built by an expression cannot be resolved statically and
 * produces at most an info "verify" finding.
 */
export class ListenerResponseContentTypeRule extends BaseRule {
  id = 'HTTP-005';
  name = 'Listener Response Content Type';
  description = 'HTTP listener responses should declare a content type';
  severity = 'info' as const;
  category = 'http' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const reportDynamicHeaders = this.getOption<boolean>(context, 'reportDynamicHeaders', true);

    const responses = this.select(
      '//*[local-name()="response" or local-name()="error-response"][ancestor::*[local-name()="listener"]]',
      doc,
    );

    for (const response of responses) {
      const state = this.inspectContentType(response);
      if (state === 'present') {
        continue;
      }

      const localName = (response as Element).localName;

      if (state === 'dynamic-unverified') {
        if (reportDynamicHeaders) {
          issues.push(
            this.createIssue(
              response,
              `Listener <${localName}> sets headers via an expression — verify Content-Type is included`,
              {
                suggestion:
                  'Ensure the header expression always includes a Content-Type entry, or set it explicitly',
              },
            ),
          );
        }
        continue;
      }

      issues.push(
        this.createIssue(response, `Listener <${localName}> does not declare a Content-Type`, {
          suggestion:
            'Add <http:headers>#[{"Content-Type": "application/json"}]</http:headers>, or set the mimeType on the payload',
        }),
      );
    }

    return issues;
  }

  /**
   * Determine whether a response makes its content type visible.
   *
   * Mirrors MULE-402's tri-state so the two halves of the same question behave
   * consistently.
   */
  private inspectContentType(response: Node): 'present' | 'missing' | 'dynamic-unverified' {
    let sawDynamic = false;

    // A mimeType attribute on the response itself
    const mimeType = this.getAttribute(response, 'mimeType');
    if (mimeType && mimeType.trim().length > 0) {
      return 'present';
    }

    // Individual <http:header headerName="Content-Type"/> entries
    for (const header of this.select('.//*[local-name()="header"]', response)) {
      const headerName = this.getAttribute(header, 'headerName') ?? '';
      if (headerName.toLowerCase() === 'content-type') {
        return 'present';
      }
    }

    // A <http:headers> block, either an attribute expression or element text
    for (const headers of this.select('.//*[local-name()="headers"]', response)) {
      const value = this.getAttribute(headers, 'value') ?? '';
      const text = headers.textContent ?? '';

      for (const candidate of [value, text]) {
        if (candidate.trim().length === 0) {
          continue;
        }
        if (candidate.toLowerCase().includes('content-type')) {
          return 'present';
        }
        if (candidate.includes('#[')) {
          sawDynamic = true;
        }
      }
    }

    // A DataWeave output directive anywhere in the response body
    if (/output\s+[\w-]+\/[\w.+-]+/i.test(response.textContent ?? '')) {
      return 'present';
    }

    return sawDynamic ? 'dynamic-unverified' : 'missing';
  }
}
