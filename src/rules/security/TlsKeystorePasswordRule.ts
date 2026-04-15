import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-009: TLS Keystore/Truststore Passwords Secured
 *
 * TLS context keystore and truststore passwords must use secure property
 * placeholders (`${secure::...}`) rather than plain-text placeholders or
 * hardcoded values.
 *
 * These passwords protect the private keys and certificates used for
 * mutual TLS (mTLS) authentication.  Leaking them enables impersonation
 * attacks and man-in-the-middle interception.
 */
export class TlsKeystorePasswordRule extends BaseRule {
  id = 'SEC-009';
  name = 'TLS Keystore Password Secured';
  description = 'TLS keystore/truststore passwords must use ${secure::} placeholders';
  severity = 'error' as const;
  category = 'security' as const;
  issueType: IssueType = 'vulnerability';

  private readonly PASSWORD_ATTRS = ['password', 'keyPassword'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Select all key-store and trust-store elements
    const stores = this.select('//*[local-name()="key-store" or local-name()="trust-store"]', doc);

    for (const store of stores) {
      for (const attrName of this.PASSWORD_ATTRS) {
        const value = this.getAttribute(store, attrName);
        if (!value || value.trim() === '') {
          continue;
        }

        // DataWeave expressions are OK
        if (value.startsWith('#[')) {
          continue;
        }

        // Must use ${secure::...}
        if (value.includes('${') && !value.includes('${secure::')) {
          const storeName = (store as Element).localName;
          issues.push(
            this.createIssue(
              store,
              `TLS ${storeName} "${attrName}" uses plain property placeholder — must use \${secure::}`,
              {
                suggestion: `Replace ${value} with \${secure::${this.extractPropName(value)}}`,
              },
            ),
          );
        }

        // Hardcoded value
        if (!value.includes('${') && !value.startsWith('#[')) {
          const storeName = (store as Element).localName;
          issues.push(
            this.createIssue(
              store,
              `TLS ${storeName} "${attrName}" is hardcoded — must use \${secure::} placeholder`,
              {
                severity: 'error',
                suggestion: `Use \${secure::tls.${storeName}.${attrName}} instead of the hardcoded value`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private extractPropName(placeholder: string): string {
    const match = /\$\{([^}]+)\}/.exec(placeholder);
    return match ? match[1] : placeholder;
  }
}
