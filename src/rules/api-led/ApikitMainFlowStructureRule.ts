import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * API-006: APIKit Main Flow Structure
 *
 * The main flow in an APIKit project should follow the standard pattern:
 *   <http:listener> → <apikit:router>
 *
 * The main flow should not contain business logic — it should only
 * receive requests and delegate to APIKit-generated implementation flows.
 * This is the pattern used in all accelerator projects.
 */
export class ApikitMainFlowStructureRule extends BaseRule {
  id = 'API-006';
  name = 'APIKit Main Flow Structure';
  description = 'APIKit main flow should contain only listener and router, no business logic';
  severity = 'warning' as const;
  category = 'api-led' as const;
  issueType: IssueType = 'code-smell';

  /** Max number of direct child elements (excluding error-handler) allowed in main flow */
  private readonly MAX_MAIN_FLOW_CHILDREN = 4;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find flows that look like APIKit main flows
    const flows = this.select('//mule:flow', doc);

    for (const flow of flows) {
      const flowName = this.getAttribute(flow, 'name') ?? '';

      // Detect main flow: typically *-main or contains apikit:router
      const hasRouter = this.exists('.//*[local-name()="router"]', flow);

      if (!hasRouter) {
        continue; // Not an APIKit main flow
      }

      const isMainFlow =
        flowName.endsWith('-main') ||
        flowName.includes('-api-main') ||
        flowName.includes('api-main');

      if (!isMainFlow && !hasRouter) {
        continue;
      }

      // Count child elements (excluding error-handler and comments)
      const children = this.select(
        './*[not(local-name()="error-handler") and not(local-name()="description")]',
        flow as Document,
      );

      if (children.length > this.MAX_MAIN_FLOW_CHILDREN) {
        issues.push(
          this.createIssue(
            flow,
            `APIKit main flow "${flowName}" has ${children.length} operations — should contain only listener and router`,
            {
              suggestion:
                'Move business logic to APIKit implementation flows (e.g., get:\\resource:config). The main flow should only receive and route.',
            },
          ),
        );
      }
    }

    return issues;
  }
}
