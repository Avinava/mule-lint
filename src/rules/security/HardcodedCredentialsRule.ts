import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-201: Hardcoded Credentials
 *
 * Passwords and secrets should use secure property placeholders.
 *
 * Enhanced to cover Salesforce connector-specific sensitive attributes
 * (consumerKey, storePassword, tokenId, tokenSecret) and NetSuite
 * OAuth attributes (consumerSecret, tokenKey, tokenSecret).
 */
export class HardcodedCredentialsRule extends BaseRule {
  id = 'MULE-201';
  name = 'Hardcoded Credentials';
  description = 'Passwords and secrets should use secure property placeholders ${secure::}';
  severity = 'error' as const;
  category = 'security' as const;
  issueType: IssueType = 'vulnerability';

  private readonly SENSITIVE_ATTRS = [
    'password',
    'secret',
    'clientSecret',
    'client-secret',
    'apiKey',
    'api-key',
    'token',
    'accessToken',
    'privateKey',
    // Salesforce connector attrs
    'consumerKey',
    'consumerSecret',
    'storePassword',
    'tokenId',
    'tokenSecret',
    // NetSuite OAuth attrs
    'tokenKey',
    // Keystore/truststore
    'keyPassword',
    'keystorePassword',
  ];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allElements = doc.getElementsByTagName('*');

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      const attrs = element.attributes;

      for (let j = 0; j < attrs.length; j++) {
        const attr = attrs[j];
        const attrName = attr.name.toLowerCase();
        const value = attr.value;

        // Check if this is a sensitive attribute
        if (this.isSensitiveAttribute(attrName) && this.isHardcoded(value)) {
          issues.push(
            this.createIssue(
              element,
              `Hardcoded ${attr.name} found - use secure property placeholder`,
              {
                suggestion: `Use \${secure::${attr.name}} instead of hardcoded value`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private isSensitiveAttribute(attrName: string): boolean {
    return this.SENSITIVE_ATTRS.some((sensitive) => attrName.includes(sensitive.toLowerCase()));
  }

  private isHardcoded(value: string): boolean {
    // Empty values are not hardcoded
    if (!value || value.trim() === '') {
      return false;
    }

    // Ignore boolean/numeric flags (e.g. useToken="true", timeout="1000")
    if (value === 'true' || value === 'false' || !isNaN(Number(value))) {
      return false;
    }

    // Check for any property placeholder - value defined elsewhere
    // Allows ${...}, ${secure::...}, ${p(...)}, #[...], etc.
    if (value.includes('${') || value.startsWith('#[')) {
      return false;
    }

    // Any other value is considered "hardcoded" in this context
    return true;
  }
}
