import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * SEC-015: CORS Policy Evidence
 *
 * A browser-facing API needs a CORS policy. Static analysis cannot see a policy
 * applied in API Manager, and it cannot always tell whether an API is called
 * from a browser at all, so this rule reports only the absence of visible
 * evidence and only where browser exposure is indicated.
 *
 * Applicability is either an explicit `browserFacing: true` option or the
 * presence of an APIKit flow handling the OPTIONS method. When neither holds,
 * the rule emits nothing.
 */
export class CorsPolicyEvidenceRule extends ProjectRule {
  id = 'SEC-015';
  name = 'CORS Policy Evidence';
  description = 'Browser-facing APIs should have visible CORS configuration';
  severity = 'info' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    if (!projectContext?.hasHttpListener) {
      return [];
    }

    const browserFacing = this.getOption<boolean>(context, 'browserFacing', false);
    const isApplicable = browserFacing || (projectContext.hasOptionsFlow ?? false);
    if (!isApplicable) {
      return [];
    }

    if (projectContext.hasCorsConfig) {
      return [];
    }

    const allowGatewayManagedCors = this.getOption<boolean>(
      context,
      'allowGatewayManagedCors',
      false,
    );
    if (allowGatewayManagedCors && projectContext.hasAutoDiscovery) {
      return [];
    }

    return [
      this.createProjectIssue('No CORS configuration was detected for a browser-facing HTTP API', {
        suggestion:
          'Add a CORS interceptor to the listener configuration, or apply a CORS policy in API Manager and enable allowGatewayManagedCors',
      }),
    ];
  }
}
