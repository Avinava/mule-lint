import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-402: HTTP Request Content-Type
 * 
 * POST/PUT HTTP requests should include Content-Type header.
 */
export class HttpContentTypeRule extends BaseRule {
    id = 'MULE-402';
    name = 'HTTP Request Content-Type';
    description = 'POST/PUT HTTP requests should include Content-Type header';
    severity = 'warning' as const;
    category = 'http' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find HTTP requests
        const httpRequests = this.select('//*[local-name()="request"]', doc);

        for (const request of httpRequests) {
            const nodeName = request.nodeName;
            if (!nodeName.includes('http:') && !nodeName.includes(':request')) continue;

            const method = this.getAttribute(request, 'method')?.toUpperCase();

            // Only check POST and PUT methods
            if (method === 'POST' || method === 'PUT') {
                const hasContentType = this.hasContentTypeHeader(request);

                if (!hasContentType) {
                    const docName = this.getDocName(request) ?? 'HTTP Request';
                    issues.push(this.createIssue(
                        request,
                        `${method} request "${docName}" is missing Content-Type header`,
                        {
                            suggestion: 'Add header: <http:header headerName="Content-Type" value="application/json"/>'
                        }
                    ));
                }
            }
        }

        return issues;
    }

    private hasContentTypeHeader(request: Node): boolean {
        const headers = this.select('.//*[local-name()="header"]', request as Document);
        for (const header of headers) {
            const headerName = this.getAttribute(header, 'headerName') ?? '';
            if (headerName.toLowerCase() === 'content-type') {
                return true;
            }
        }
        return false;
    }
}
