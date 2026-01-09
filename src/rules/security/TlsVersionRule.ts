import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-002: TLS Version Check
 *
 * Detects use of deprecated TLS versions (< 1.2) which are security vulnerabilities.
 * TLS 1.0 and 1.1 are deprecated and should not be used per 2025 security standards.
 */
export class TlsVersionRule extends BaseRule {
    id = 'SEC-002';
    name = 'TLS Version Check';
    description = 'Detect use of deprecated TLS versions (< 1.2)';
    severity = 'error' as const;
    category = 'security' as const;

    private readonly deprecatedProtocols = ['TLSv1', 'TLSv1.0', 'TLSv1.1', 'SSLv3', 'SSLv2'];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find all TLS context configurations
        const tlsContexts = this.select('//*[local-name()="context"]', doc);

        for (const context of tlsContexts) {
            const element = context as Element;
            const enabledProtocols = element.getAttribute('enabledProtocols');

            if (enabledProtocols) {
                const protocols = enabledProtocols.split(',').map((p) => p.trim());
                const deprecated = protocols.filter((p) =>
                    this.deprecatedProtocols.some(
                        (dp) => p.toUpperCase() === dp.toUpperCase(),
                    ),
                );

                if (deprecated.length > 0) {
                    issues.push(
                        this.createIssue(
                            context,
                            `Deprecated TLS protocol(s) enabled: ${deprecated.join(', ')}`,
                            {
                                suggestion:
                                    'Use TLSv1.2 or TLSv1.3 only. Remove deprecated protocols from enabledProtocols',
                            },
                        ),
                    );
                }
            }
        }

        // Check for explicit protocol configurations in tls:context
        const protocolElements = this.select(
            '//*[local-name()="enabled-protocols"]/*[local-name()="protocol"]',
            doc,
        );

        for (const protocol of protocolElements) {
            const element = protocol as Element;
            const value = element.textContent?.trim() || '';

            if (
                this.deprecatedProtocols.some(
                    (dp) => value.toUpperCase() === dp.toUpperCase(),
                )
            ) {
                issues.push(
                    this.createIssue(
                        protocol,
                        `Deprecated TLS protocol configured: ${value}`,
                        {
                            suggestion:
                                'Remove deprecated protocol. Use TLSv1.2 or TLSv1.3 only',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
