import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-301: Logger Payload Reference
 *
 * Loggers should not directly reference #[payload] for security/performance.
 * This includes:
 *   - Direct payload reference: #[payload]
 *   - DataWeave write of full payload: write(payload, 'application/json')
 *   - output application/json --- payload (full payload serialization)
 *
 * Logging the entire payload risks exposing PII/sensitive customer data
 * (names, addresses, SSNs, credit cards) and can degrade performance for
 * large payloads.
 */
export class LoggerPayloadRule extends BaseRule {
  id = 'MULE-301';
  name = 'Logger Payload Reference';
  description = 'Loggers should not directly log entire payload';
  severity = 'warning' as const;
  category = 'logging' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Check standard logger elements with message attribute
    const loggers = this.select('//*[local-name()="logger"]', doc);
    for (const logger of loggers) {
      const message = this.getAttribute(logger, 'message') ?? '';

      if (this.hasDirectPayloadReference(message)) {
        const docName = this.getDocName(logger) ?? 'Logger';
        issues.push(
          this.createIssue(
            logger,
            `Logger "${docName}" logs entire payload - security/performance risk`,
            {
              suggestion:
                'Log specific fields instead: #[payload.orderId] or use a masking DataWeave module',
            },
          ),
        );
      }
    }

    // Check ee:transform set-payload inside logger contexts
    // (Some projects put write(payload,...) in transform message elements)
    const transforms = this.select('//*[local-name()="transform"]', doc);
    for (const transform of transforms) {
      // Check all text content in set-payload / set-variable / message elements
      const payloadSetters = this.select(
        './/*[local-name()="set-payload" or local-name()="set-variable"]',
        transform as Document,
      );
      for (const setter of payloadSetters) {
        const content = setter.textContent ?? '';
        if (this.hasPayloadSerialization(content)) {
          const docName = this.getDocName(transform) ?? 'Transform';
          issues.push(
            this.createIssue(
              transform,
              `Transform "${docName}" serializes entire payload (write(payload,...)) - PII exposure risk`,
              {
                severity: 'warning',
                suggestion:
                  'Serialize only specific fields or use a masking function to redact sensitive data before logging',
              },
            ),
          );
          break; // One issue per transform
        }
      }
    }

    return issues;
  }

  private hasDirectPayloadReference(message: string): boolean {
    // Match #[payload] but not #[payload.something]
    return (
      /#\[payload\s*\]/.test(message) ||
      /#\[\s*payload\s*\]/.test(message) ||
      message === '#[payload]' ||
      this.hasPayloadSerialization(message)
    );
  }

  /**
   * Detect DataWeave patterns that serialize the full payload:
   *   - write(payload, 'application/json')
   *   - write(payload, "application/json")
   *   - output application/json --- payload
   */
  private hasPayloadSerialization(content: string): boolean {
    // write(payload, ...) — serializes entire payload to string
    if (/write\s*\(\s*payload\s*,/.test(content)) {
      return true;
    }
    // output ... --- payload (entire payload as output body)
    if (/---\s*payload\s*$/.test(content.trim())) {
      return true;
    }
    return false;
  }
}
