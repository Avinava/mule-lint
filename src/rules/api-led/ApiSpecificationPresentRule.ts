import { ValidationContext, Issue } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * API-009: API Specification Present
 *
 * An HTTP-exposed project should have a RAML or OpenAPI document in the
 * repository so the contract is versioned alongside the implementation.
 *
 * Detection is by content rather than location: a `.raml` file whose first
 * meaningful line begins with `#%RAML`, or a `.yaml`/`.yml`/`.json` file with a
 * top-level `openapi` or `swagger` key. The pre-scan performs the discovery.
 *
 * This rule identifies a specification; it does not validate one.
 */
export class ApiSpecificationPresentRule extends ProjectRule {
  id = 'API-009';
  name = 'API Specification Present';
  description = 'HTTP-exposed projects should include a RAML or OpenAPI specification';
  severity = 'warning' as const;
  category = 'api-led' as const;

  /** POM artifactId fragments that look like a published API contract. */
  private static readonly SPEC_ARTIFACT_HINTS = ['-api', 'api-spec', 'raml', 'oas', 'openapi'];

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    if (!projectContext?.hasHttpListener) {
      return [];
    }

    if (projectContext.hasApiSpec) {
      return [];
    }

    const allowExchangeDependency = this.getOption<boolean>(
      context,
      'allowExchangeDependency',
      false,
    );
    if (allowExchangeDependency && this.hasSpecDependency(projectContext.dependencyArtifactIds)) {
      return [];
    }

    return [
      this.createProjectIssue(
        'Project exposes HTTP listeners but no RAML or OpenAPI specification was found in src/main/resources',
        {
          suggestion:
            'Add the API specification under src/main/resources/api so the contract is versioned with the implementation',
        },
      ),
    ];
  }

  /**
   * Look for a dependency that plausibly carries an API contract.
   *
   * Deliberately narrow: accepting every ZIP dependency as a specification
   * would make the rule meaningless.
   */
  private hasSpecDependency(artifactIds: string[] | undefined): boolean {
    if (!artifactIds) {
      return false;
    }
    return artifactIds.some((id) =>
      ApiSpecificationPresentRule.SPEC_ARTIFACT_HINTS.some((hint) =>
        id.toLowerCase().includes(hint),
      ),
    );
  }
}
