import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-403: HTTP Request Timeout
 *
 * HTTP requests should have explicit timeout configuration.
 */
export class HttpTimeoutRule extends BaseRule {
    id = 'MULE-403';
    name = 'HTTP Request Timeout';
    description = 'HTTP requests should have explicit timeout configuration';
    severity = 'warning' as const;
    category = 'http' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find HTTP request configurations
        const requestConfigs = this.select('//*[local-name()="request-config"]', doc);

        for (const config of requestConfigs) {
            const hasTimeout = this.getAttribute(config, 'responseTimeout') !== null;

            if (!hasTimeout) {
                const name = this.getNameAttribute(config) ?? 'HTTP Request Config';
                issues.push(
                    this.createIssue(
                        config,
                        `HTTP config "${name}" has no responseTimeout - defaults may cause issues`,
                        {
                            suggestion: 'Add responseTimeout="30000" or appropriate value',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
