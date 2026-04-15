import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-008: Secure Properties Key Configuration
 *
 * The `<secure-properties:config>` element's `key` attribute must use a
 * property placeholder (`${...}`) — never a hardcoded encryption key.
 *
 * A hardcoded key in the XML defeats the purpose of encryption because
 * anyone with access to the source code can decrypt all secure properties.
 * The key should be injected via a system property or environment variable
 * at deployment time (e.g., `-Dsecure.key=...` in the Mule runtime args).
 */
export class SecurePropertiesKeyRule extends BaseRule {
  id = 'SEC-008';
  name = 'Secure Properties Key';
  description = 'Secure properties encryption key must not be hardcoded';
  severity = 'error' as const;
  category = 'security' as const;
  issueType: IssueType = 'vulnerability';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Match secure-properties:config or secure-configuration-properties
    const secureConfigs = this.select(
      '//*[local-name()="config" and contains(namespace-uri(), "secure-properties")] | ' +
        '//*[local-name()="secure-configuration-properties"]',
      doc,
    );

    for (const config of secureConfigs) {
      const key = this.getAttribute(config, 'key');
      if (!key) {
        continue;
      }

      // Key must be a property placeholder
      if (!key.includes('${')) {
        const docName = this.getDocName(config) ?? 'Secure Properties Config';
        issues.push(
          this.createIssue(
            config,
            `"${docName}" has hardcoded encryption key — defeats the purpose of property encryption`,
            {
              suggestion:
                'Use a property placeholder: key="${secure.key}" and inject via -Dsecure.key=... at runtime',
            },
          ),
        );
      }
    }

    return issues;
  }
}
