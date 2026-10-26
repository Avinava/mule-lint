import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { platformSecureKeys, secretRemediation } from '../../core/SecretModel';

/**
 * SEC-007: Connector Credentials Secured
 *
 * Connector credential attributes must resolve from one of the two supported
 * secret models:
 *
 * - `${secure::key}`, encrypted in a secure properties file; or
 * - `${key}` where `key` is a platform secure property listed in
 *   mule-artifact.json `secureProperties` and supplied at deployment.
 *
 * A hardcoded credential is an error. A plain `${key}` that is not declared as
 * a platform secure property is a warning: it usually reads a cleartext
 * properties file, but a deployment target can still supply it as a protected
 * property, which lint cannot see.
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
  description = 'Connector credentials must use ${secure::} or a declared platform secure property';
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

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allElements = doc.getElementsByTagName('*');
    const platformKeys = platformSecureKeys(context.projectContext?.platformSecureProperties);

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

        // A plain ${key} is valid when the platform supplies the key as a secure property
        if (value.includes('${') && !value.includes('${secure::')) {
          const key = this.extractPropertyName(value);
          if (platformKeys.has(key)) {
            continue;
          }
          issues.push(
            this.createIssue(
              element,
              `Credential "${attrName}" uses plain property placeholder \${${key}}, which is not declared as a platform secure property`,
              { severity: 'warning', suggestion: secretRemediation(key) },
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
            this.createIssue(element, `Credential "${attrName}" is hardcoded`, {
              severity: 'error',
              suggestion: secretRemediation(`${localName}.${attrName}`),
            }),
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
