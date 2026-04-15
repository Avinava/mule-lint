import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * ERR-001: Try Scope Best Practice
 *
 * Complex operations (DB calls, HTTP requests) should use Try scope
 * for granular error isolation and handling.
 *
 * Enhanced to also check sub-flows containing http:request without
 * Try scope — sub-flows are often called from multiple places and
 * should handle their own errors for isolation.
 */
export class TryScopeRule extends BaseRule {
  id = 'ERR-001';
  name = 'Try Scope Best Practice';
  description = 'Complex operations should use Try scope for error isolation';
  severity = 'info' as const;
  category = 'error-handling' as const;
  issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find flows and sub-flows with risky operations
    const flows = this.select('//mule:flow', doc);
    const subFlows = this.select('//mule:sub-flow', doc);

    for (const flow of flows) {
      const flowElement = flow as Element;
      const flowName = flowElement.getAttribute('name') ?? 'unnamed';

      // Count risky operations (DB, HTTP, external calls)
      const riskyOps = this.countRiskyOperations(flow);

      // Check if Try scope exists
      const tryScopes = this.select('.//*[local-name()="try"]', flow);

      // If multiple external calls but no Try scope
      if (riskyOps >= 2 && tryScopes.length === 0) {
        issues.push(
          this.createIssue(
            flow,
            `Flow "${flowName}" has ${String(riskyOps)} external calls without Try scope isolation`,
            {
              suggestion:
                'Wrap risky operations in Try scope for granular error handling and isolation',
            },
          ),
        );
      }
    }

    // Sub-flows with http:request should also use Try scope
    for (const subFlow of subFlows) {
      const subFlowElement = subFlow as Element;
      const subFlowName = subFlowElement.getAttribute('name') ?? 'unnamed';

      const httpRequests = this.select(
        './/*[local-name()="request" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
        subFlow,
      );

      if (httpRequests.length > 0) {
        const tryScopes = this.select('.//*[local-name()="try"]', subFlow);
        if (tryScopes.length === 0) {
          issues.push(
            this.createIssue(
              subFlow,
              `Sub-flow "${subFlowName}" contains http:request without Try scope — errors will propagate to all callers`,
              {
                suggestion:
                  'Wrap the http:request in a Try scope within the sub-flow for isolated error handling',
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private countRiskyOperations(node: Node): number {
    const dbOps = this.select(
      './/*[namespace-uri()="http://www.mulesoft.org/schema/mule/db"]',
      node,
    );
    const httpReqs = this.select(
      './/*[local-name()="request" and namespace-uri()="http://www.mulesoft.org/schema/mule/http"]',
      node,
    );
    const wsConsumers = this.select(
      './/*[local-name()="consume" and namespace-uri()="http://www.mulesoft.org/schema/mule/wsc"]',
      node,
    );
    return dbOps.length + httpReqs.length + wsConsumers.length;
  }
}
