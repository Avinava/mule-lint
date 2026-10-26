import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';
import {
  isElementSecretAttribute,
  isLiteralAttributeValue,
  isSensitiveAttribute,
} from '../../core/SensitiveKeys';
import { secretRemediation } from '../../core/SecretModel';

/**
 * MULE-201: Hardcoded Credentials
 *
 * Sensitive attributes should resolve from a property rather than hold a literal.
 *
 * Attributes are classified by the shared SensitiveKeys endings, so `password`,
 * `storePassword`, `securityToken`, and `tokenKey` match while `tokenUrl` and
 * `passwordPolicy` do not. The decryption key of `<secure-properties:config>` is
 * owned by SEC-008 and is not reported twice.
 */
export class HardcodedCredentialsRule extends BaseRule {
  id = 'MULE-201';
  name = 'Hardcoded Credentials';
  description = 'Passwords and secrets should use secure property placeholders ${secure::}';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allElements = doc.getElementsByTagName('*');

    for (const element of Array.from(allElements)) {
      for (const attr of Array.from(element.attributes)) {
        if (!isSensitiveAttribute(element, attr.name)) {
          continue;
        }
        if (isElementSecretAttribute(element, attr.name)) {
          continue;
        }
        if (!isLiteralAttributeValue(attr.value)) {
          continue;
        }

        issues.push(
          this.createIssue(
            element,
            `Hardcoded ${attr.name} found - use secure property placeholder`,
            { suggestion: secretRemediation(attr.name) },
          ),
        );
      }
    }

    return issues;
  }
}
