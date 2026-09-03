import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-014: Basic Authentication Usage
 *
 * Basic Authentication sends reusable credentials on every request. Where the
 * target system supports it, a token-based scheme such as OAuth 2.0 limits the
 * damage a leaked credential can do.
 *
 * This is a warning rather than an error: Basic Authentication is sometimes a
 * deliberate compatibility choice for a legacy system. Use `allowedConnectors`
 * to record that decision.
 */
export class BasicAuthenticationRule extends BaseRule {
  id = 'SEC-014';
  name = 'Basic Authentication Usage';
  description = 'Prefer token-based authentication over HTTP Basic Authentication';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allowedConnectors = this.getOption<string[]>(context, 'allowedConnectors', []);
    const excludePatterns = this.getOption<string[]>(context, 'excludePatterns', []);

    if (excludePatterns.length > 0 && this.isExcluded(context.relativePath, excludePatterns)) {
      return issues;
    }

    // Namespace-prefix independent: match on local name only.
    const elements = this.select(
      '//*[contains(local-name(), "basic-authentication") or contains(local-name(), "basic-auth")]',
      doc,
    );

    for (const element of elements) {
      const localName = (element as Element).localName;
      const configName = this.getEnclosingName(element);

      if (allowedConnectors.length > 0 && this.isExcluded(configName, allowedConnectors)) {
        continue;
      }

      issues.push(
        this.createIssue(element, `Basic Authentication configured via <${localName}>`, {
          suggestion:
            'Prefer OAuth 2.0 client credentials or another token-based scheme where the target system supports it; otherwise list the connector in allowedConnectors',
        }),
      );
    }

    return issues;
  }

  /** Nearest named ancestor, used to match against allowedConnectors. */
  private getEnclosingName(node: Node): string {
    let current: Node | null = node;
    while (current) {
      const name = (current as Element).getAttribute('name');
      if (name) {
        return name;
      }
      current = current.parentNode;
    }
    return '';
  }
}
