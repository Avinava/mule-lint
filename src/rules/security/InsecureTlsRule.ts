import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-202: Insecure TLS Configuration
 *
 * TLS configurations should not disable certificate verification.
 */
export class InsecureTlsRule extends BaseRule {
    id = 'MULE-202';
    name = 'Insecure TLS Configuration';
    description = 'TLS configurations should not disable certificate verification';
    severity = 'error' as const;
    category = 'security' as const;
    issueType: IssueType = 'vulnerability';

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find insecure trust-store configurations
        const insecureTrustStores = this.select(
            '//*[local-name()="trust-store"][@insecure="true"]',
            doc,
        );

        for (const trustStore of insecureTrustStores) {
            issues.push(
                this.createIssue(
                    trustStore,
                    'TLS trust-store has insecure="true" - certificates not verified',
                    {
                        suggestion:
                            'Remove insecure="true" and configure proper certificate validation',
                    },
                ),
            );
        }

        // Find insecure key-store configurations
        const insecureKeyStores = this.select(
            '//*[local-name()="key-store"][@insecure="true"]',
            doc,
        );

        for (const keyStore of insecureKeyStores) {
            issues.push(
                this.createIssue(keyStore, 'TLS key-store has insecure="true"', {
                    suggestion: 'Remove insecure="true" and use proper key management',
                }),
            );
        }

        return issues;
    }
}
