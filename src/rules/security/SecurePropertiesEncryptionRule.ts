import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-010: Secure Properties Encryption Algorithm
 *
 * When `<secure-properties:config>` specifies an encryption algorithm, it
 * should use a strong algorithm (AES, Blowfish) and not a weak or
 * deprecated one (DES, RC2, RC4).
 *
 * Also validates that when secure properties are used, the `encrypt`
 * element exists (i.e., properties are actually encrypted, not just
 * marked as "secure" with no encryption).
 */
export class SecurePropertiesEncryptionRule extends BaseRule {
  id = 'SEC-010';
  name = 'Secure Properties Encryption';
  description = 'Secure properties must use strong encryption algorithms';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  private readonly WEAK_ALGORITHMS = ['DES', 'DESede', 'RC2', 'RC4'];
  private readonly STRONG_ALGORITHMS = ['AES', 'Blowfish'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Match secure-properties:config or secure-configuration-properties
    const secureConfigs = this.select(
      '//*[local-name()="config" and contains(namespace-uri(), "secure-properties")] | ' +
        '//*[local-name()="secure-configuration-properties"]',
      doc,
    );

    for (const config of secureConfigs) {
      // Check for encrypt element presence
      const encryptElements = this.select('.//*[local-name()="encrypt"]', config);

      if (encryptElements.length === 0) {
        const docName = this.getDocName(config) ?? 'Secure Properties Config';
        issues.push(
          this.createIssue(
            config,
            `"${docName}" has no <encrypt> element — properties may not be encrypted`,
            {
              severity: 'warning',
              suggestion:
                'Add <secure-properties:encrypt algorithm="AES" mode="CBC"/> to enable encryption',
            },
          ),
        );
        continue;
      }

      // Check encryption algorithm
      for (const encrypt of encryptElements) {
        const algorithm = this.getAttribute(encrypt, 'algorithm');
        if (!algorithm) {
          continue;
        }

        if (this.WEAK_ALGORITHMS.includes(algorithm)) {
          issues.push(
            this.createIssue(
              encrypt,
              `Weak encryption algorithm "${algorithm}" — use ${this.STRONG_ALGORITHMS.join(' or ')} instead`,
              {
                severity: 'error',
                suggestion: `Replace algorithm="${algorithm}" with algorithm="AES"`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}
