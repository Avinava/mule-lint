import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * PERF-002: Connection Pooling Check
 *
 * DB and HTTP connectors should configure connection pools
 * for optimal performance and resource management.
 */
export class ConnectionPoolingRule extends BaseRule {
    id = 'PERF-002';
    name = 'Connection Pooling';
    description = 'DB/HTTP connectors should configure connection pools';
    severity = 'warning' as const;
    category = 'performance' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check HTTP request configurations
        const httpConfigs = this.select(
            '//*[local-name()="request-config" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
            doc,
        );

        for (const config of httpConfigs) {
            const element = config as Element;
            const name = element.getAttribute('name') || 'unnamed';

            // Check for connection pooling attributes
            const hasPooling =
                element.hasAttribute('maxConnections') ||
                element.hasAttribute('connectionIdleTimeout') ||
                this.select('.//*[local-name()="pooling-profile"]', config).length > 0;

            if (!hasPooling) {
                issues.push(
                    this.createIssue(
                        config,
                        `HTTP request config "${name}" has no connection pooling configured`,
                        {
                            suggestion:
                                'Add maxConnections and connectionIdleTimeout for optimal connection management',
                        },
                    ),
                );
            }
        }

        // Check Database configurations
        const dbConfigs = this.select(
            '//*[local-name()="config" and namespace-uri()="http://www.mulesoft.org/schema/mule/db"]',
            doc,
        );

        for (const config of dbConfigs) {
            const element = config as Element;
            const name = element.getAttribute('name') || 'unnamed';

            // Check for pooling profile
            const hasPooling =
                this.select('.//*[local-name()="pooling-profile"]', config).length > 0;

            if (!hasPooling) {
                issues.push(
                    this.createIssue(
                        config,
                        `Database config "${name}" has no connection pooling configured`,
                        {
                            suggestion:
                                'Add db:pooling-profile with maxPoolSize and minPoolSize for optimal performance',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
