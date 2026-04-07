import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-006: Encryption Key in Logs
 *
 * Encryption keys and sensitive credentials should not appear in log statements.
 */
export class EncryptionKeyInLogsRule extends BaseRule {
  id = 'SEC-006';
  name = 'Encryption Key in Logs';
  description = 'Encryption keys and sensitive data should not appear in logs';
  severity = 'error' as const;
  category = 'security' as const;

  private sensitivePatterns = [
    /encrypt.*key/i,
    /decryption.*key/i,
    /secret.*key/i,
    /api[_-]?key/i,
    /password/i,
    /credentials?/i,
    /mule\.key/i,
    /secure::.*key/i,
  ];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find all loggers
    const loggers = this.select('//*[local-name()="logger"]', doc);

    for (const logger of loggers) {
      const message = this.getAttribute(logger, 'message') ?? '';

      // Check for sensitive patterns in log messages
      for (const pattern of this.sensitivePatterns) {
        if (pattern.test(message)) {
          issues.push(
            this.createIssue(
              logger,
              `Logger may expose sensitive data: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
              {
                suggestion: 'Remove encryption keys and sensitive data from log messages',
              },
            ),
          );
          break; // Only one issue per logger
        }
      }
    }

    return issues;
  }
}
