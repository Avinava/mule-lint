import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-401: HTTP Request User-Agent
 *
 * HTTP requests should include User-Agent header for proper API identification.
 * This is particularly important for external APIs. For internal APIs, this check
 * can be disabled via configuration.
 */
export class HttpUserAgentRule extends BaseRule {
    id = 'MULE-401';
    name = 'HTTP Request User-Agent';
    description = 'HTTP requests should include User-Agent header for external API identification';
    severity = 'info' as const;
    category = 'http' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get excluded config patterns (e.g., internal APIs)
        const excludeConfigPatterns = this.getOption<string[]>(context, 'excludeConfigs', []);

        // Find HTTP requests
        const httpRequests = this.select('//*[local-name()="request"]', doc);

        for (const request of httpRequests) {
            // Check if it's an HTTP namespace element
            const nodeName = request.nodeName;
            if (!nodeName.includes('http:') && !nodeName.includes(':request')) continue;

            // Check for excluded configs
            const configRef = this.getAttribute(request, 'config-ref') ?? '';
            if (this.isExcluded(configRef, excludeConfigPatterns)) continue;

            // Check for User-Agent header
            const hasUserAgent = this.hasUserAgentHeader(request);

            if (!hasUserAgent) {
                const docName = this.getDocName(request) ?? 'HTTP Request';
                issues.push(
                    this.createIssue(
                        request,
                        `HTTP request "${docName}" is missing User-Agent header`,
                        {
                            suggestion:
                                'Add header: <http:header headerName="User-Agent" value="${app.name}/${app.version}"/>',
                        },
                    ),
                );
            }
        }

        return issues;
    }

    private hasUserAgentHeader(request: Node): boolean {
        const headers = this.select('.//*[local-name()="header"]', request as Document);
        for (const header of headers) {
            const headerName = this.getAttribute(header, 'headerName') ?? '';
            if (headerName.toLowerCase() === 'user-agent') {
                return true;
            }
        }
        return false;
    }
}

