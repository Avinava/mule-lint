import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * SEC-016: Inbound Authentication Evidence
 *
 * Reports once per project when inbound HTTP flows exist and no supported
 * authentication component is visible in the repository.
 *
 * Authentication is frequently applied as an API Manager policy that does not
 * appear in source. The finding therefore states that no evidence was detected;
 * it never claims the API is unauthenticated. Set `acceptGatewayPolicies` to
 * treat an auto-discovery element as sufficient evidence.
 */
export class InboundAuthenticationEvidenceRule extends ProjectRule {
  id = 'SEC-016';
  name = 'Inbound Authentication Evidence';
  description = 'Inbound HTTP flows should show evidence of an authentication mechanism';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    if (!projectContext?.hasHttpListener) {
      return [];
    }

    if (projectContext.hasAuthEvidence) {
      return [];
    }

    const acceptGatewayPolicies = this.getOption<boolean>(context, 'acceptGatewayPolicies', false);
    if (acceptGatewayPolicies && projectContext.hasAutoDiscovery) {
      return [];
    }

    const listenerCount = projectContext.listenerEndpoints?.length ?? 0;
    const subject =
      listenerCount === 1 ? '1 inbound HTTP flow' : `${listenerCount} inbound HTTP flows`;

    return [
      this.createProjectIssue(
        `No authentication evidence was detected for ${subject}. Authentication may be managed outside this repository.`,
        {
          suggestion:
            'Configure OAuth, JWT validation, or client-ID enforcement in the project, or set acceptGatewayPolicies when authentication is applied by an API Manager policy',
        },
      ),
    ];
  }
}
