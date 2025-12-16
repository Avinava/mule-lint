import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-401: HTTP Request User-Agent
 * 
 * HTTP requests should include User-Agent header for proper API identification.
 */
export class HttpUserAgentRule extends BaseRule {
    id = 'MULE-401';
    name = 'HTTP Request User-Agent';
    description = 'HTTP requests should include User-Agent header';
    severity = 'warning' as const;
    category = 'http' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find HTTP requests
        const httpRequests = this.select('//*[local-name()="request"]', doc);

        for (const request of httpRequests) {
            // Check if it's an HTTP namespace element
            const nodeName = request.nodeName;
            if (!nodeName.includes('http:') && !nodeName.includes(':request')) continue;

            // Check for User-Agent header
            const hasUserAgent = this.hasUserAgentHeader(request);

            if (!hasUserAgent) {
                const docName = this.getDocName(request) ?? 'HTTP Request';
                issues.push(this.createIssue(
                    request,
                    `HTTP request "${docName}" is missing User-Agent header`,
                    {
                        suggestion: 'Add header: <http:header headerName="User-Agent" value="MyApp/1.0"/>'
                    }
                ));
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
