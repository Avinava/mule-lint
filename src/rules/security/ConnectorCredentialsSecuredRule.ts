import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-007: Connector Credentials Secured
 *
 * Salesforce, NetSuite, Database, and other connector configurations must
 * use `${secure::...}` (not plain `${...}`) for credential attributes.
 *
 * Plain property placeholders like `${sf.password}` store the value in
 * clear text in property files.  The `${secure::...}` prefix ensures the
 * value is read from an encrypted secure properties file.
 *
 * Covered connectors and attributes:
 *   - Salesforce: username, password, securityToken, consumerKey, consumerSecret
 *   - NetSuite: consumerKey, consumerSecret, tokenId, tokenSecret
 *   - Database: password, user (when not using connection URL)
 *   - HTTP Basic Auth: username, password
 *   - SMTP: password
 */
export class ConnectorCredentialsSecuredRule extends BaseRule {
  id = 'SEC-007';
  name = 'Connector Credentials Secured';
  description = 'Connector credentials must use ${secure::} property placeholders';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  /**
   * Map of element local-name patterns to their sensitive attributes.
   * We match on local-name() to be namespace-agnostic.
   */
  private readonly CONNECTOR_SENSITIVE_ATTRS: Record<string, string[]> = {
    // Salesforce connector
    'sfdc-config': ['username', 'password', 'securityToken', 'consumerKey', 'consumerSecret'],
    'salesforce-config': ['username', 'password', 'securityToken', 'consumerKey', 'consumerSecret'],
    'basic-connection': [
      'username',
      'password',
      'securityToken',
      'consumerKey',
      'consumerSecret',
      'tokenId',
      'tokenSecret',
    ],
    'oauth-user-pass-connection': ['consumerKey', 'consumerSecret'],
    'oauth-jwt-connection': ['consumerKey', 'keyStorePath', 'storePassword'],
    // NetSuite connector (token-based)
    'token-based-authentication-connection': [
      'consumerKey',
      'consumerSecret',
      'tokenId',
      'tokenSecret',
    ],
    // Database connector
    'derby-connection': ['password'],
    'generic-connection': ['password'],
    'my-sql-connection': ['password'],
    'mssql-connection': ['password'],
    'oracle-connection': ['password'],
    'data-source-connection': ['password'],
    // SMTP
    'smtps-connection': ['password'],
  };

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allElements = doc.getElementsByTagName('*');

    for (const element of Array.from(allElements)) {
      const localName = element.localName;

      const sensitiveAttrs = this.findSensitiveAttrs(localName);
      if (!sensitiveAttrs) {
        continue;
      }

      for (const attrName of sensitiveAttrs) {
        const value = element.getAttribute(attrName);
        if (!value || value.trim() === '') {
          continue;
        }

        // Skip DataWeave expressions — they're computed at runtime
        if (value.startsWith('#[')) {
          continue;
        }

        // Must use ${secure::...} — plain ${...} is not sufficient
        if (value.includes('${') && !value.includes('${secure::')) {
          issues.push(
            this.createIssue(
              element,
              `Credential "${attrName}" uses plain property placeholder — must use \${secure::} for encryption`,
              {
                suggestion: `Replace ${value} with \${secure::${this.extractPropertyName(value)}}`,
              },
            ),
          );
        }

        // Hardcoded value — no placeholder at all
        if (!value.includes('${') && !value.startsWith('#[')) {
          // Ignore booleans and numbers
          if (value === 'true' || value === 'false' || !isNaN(Number(value))) {
            continue;
          }
          issues.push(
            this.createIssue(
              element,
              `Credential "${attrName}" is hardcoded — must use \${secure::} property placeholder`,
              {
                severity: 'error',
                suggestion: `Use \${secure::${localName}.${attrName}} instead of the hardcoded value`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private findSensitiveAttrs(localName: string): string[] | undefined {
    // Exact match first
    if (this.CONNECTOR_SENSITIVE_ATTRS[localName]) {
      return this.CONNECTOR_SENSITIVE_ATTRS[localName];
    }
    // Partial match for compound names
    for (const [key, attrs] of Object.entries(this.CONNECTOR_SENSITIVE_ATTRS)) {
      if (localName.includes(key)) {
        return attrs;
      }
    }
    return undefined;
  }

  private extractPropertyName(placeholder: string): string {
    const match = /\$\{([^}]+)\}/.exec(placeholder);
    return match?.[1] ?? placeholder;
  }
}
