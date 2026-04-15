import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * API-008: APIKit Console in Production
 *
 * The APIKit console endpoint should not be enabled in production.
 * While useful for development, it exposes API documentation and
 * testing capabilities that should be disabled in production
 * environments.
 *
 * Detects: <apikit:console config-ref="..."/> elements
 */
export class ApikitConsoleProductionRule extends BaseRule {
  id = 'API-008';
  name = 'APIKit Console in Production';
  description = 'APIKit console should be disabled or protected in production deployments';
  severity = 'warning' as const;
  category = 'api-led' as const;
  issueType: IssueType = 'vulnerability';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find apikit:console elements
    const consoleElements = this.select('//*[local-name()="console"]', doc);

    for (const el of consoleElements) {
      // Confirm it's an APIKit console (has config-ref or is in apikit namespace)
      const configRef = this.getAttribute(el, 'config-ref');
      const nodeName = el.nodeName ?? '';

      // Only flag if it looks like an apikit console
      if (
        nodeName.includes('apikit') ||
        configRef?.includes('api') ||
        configRef?.includes('router')
      ) {
        issues.push(
          this.createIssue(
            el,
            'APIKit console is enabled — ensure it is disabled or protected in production',
            {
              suggestion:
                'Remove the apikit:console flow or gate it behind an environment check (e.g., only enable when mule.env != "prod")',
            },
          ),
        );
      }
    }

    return issues;
  }
}
