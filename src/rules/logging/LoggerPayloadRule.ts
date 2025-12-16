import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-301: Logger Payload Reference
 * 
 * Loggers should not directly reference #[payload] for security/performance.
 */
export class LoggerPayloadRule extends BaseRule {
    id = 'MULE-301';
    name = 'Logger Payload Reference';
    description = 'Loggers should not directly log entire payload';
    severity = 'warning' as const;
    category = 'logging' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const loggers = this.select('//mule:logger[@message]', doc);

        for (const logger of loggers) {
            const message = this.getAttribute(logger, 'message') ?? '';

            // Check for direct payload logging
            if (this.hasDirectPayloadReference(message)) {
                const docName = this.getDocName(logger) ?? 'Logger';
                issues.push(this.createIssue(
                    logger,
                    `Logger "${docName}" logs entire payload - security/performance risk`,
                    {
                        suggestion: 'Log specific fields instead: #[payload.orderId]'
                    }
                ));
            }
        }

        return issues;
    }

    private hasDirectPayloadReference(message: string): boolean {
        // Match #[payload] but not #[payload.something]
        return /\#\[payload\s*\]/.test(message) ||
            /\#\[\s*payload\s*\]/.test(message) ||
            message === '#[payload]';
    }
}
