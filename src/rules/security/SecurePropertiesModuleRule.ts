import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parsePropertiesFile } from '../../core/PropertiesParser';
import { YamlParser } from '../../core/YamlParser';
import { isSensitiveKey } from '../../core/SensitiveKeys';

/**
 * SEC-011: Secure Properties Module Required
 *
 * A project that stores sensitive configuration keys needs the Secure
 * Configuration Properties module to resolve them at runtime. Encrypted
 * `![...]` values still require it — without the module Mule cannot decrypt
 * them.
 *
 * Reported once per project. SEC-008, SEC-009, and SEC-010 continue to
 * validate key placement, TLS passwords, and encryption strength independently
 * of this rule.
 */
export class SecurePropertiesModuleRule extends ProjectRule {
  id = 'SEC-011';
  name = 'Secure Properties Module Required';
  description =
    'Projects with sensitive configuration keys should configure the Secure Properties module';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  protected validateProject(context: ValidationContext): Issue[] {
    if (context.projectContext?.hasSecurePropertiesConfig) {
      return [];
    }

    const sensitiveKey = this.findSensitiveKey(context);
    if (!sensitiveKey) {
      return [];
    }

    return [
      this.createProjectIssue(
        `Sensitive configuration keys are present (for example "${sensitiveKey}") but no Secure Configuration Properties module was found`,
        {
          suggestion:
            'Add a <secure-properties:config> element with an externalized key, and add the secure-configuration-property module to pom.xml',
        },
      ),
    ];
  }

  /**
   * Find the first sensitive key in project resources, or undefined when the
   * project stores no secrets at all.
   */
  private findSensitiveKey(context: ValidationContext): string | undefined {
    const resourcesPath = path.join(context.projectRoot, 'src/main/resources');
    if (!fs.existsSync(resourcesPath)) {
      return undefined;
    }

    const files = fg
      .sync(['**/*.properties', '**/*.yaml', '**/*.yml'], {
        cwd: resourcesPath,
        onlyFiles: true,
        ignore: ['**/target/**', '**/node_modules/**'],
      })
      .sort();

    for (const file of files) {
      const absolutePath = path.join(resourcesPath, file);

      if (file.endsWith('.properties')) {
        const match = parsePropertiesFile(absolutePath).find((entry) => isSensitiveKey(entry.key));
        if (match) {
          return match.key;
        }
        continue;
      }

      const parsed = YamlParser.parseFile(absolutePath);
      if (!parsed) {
        continue;
      }
      const match = YamlParser.getAllKeys(parsed).find((key) => isSensitiveKey(key));
      if (match) {
        return match;
      }
    }

    return undefined;
  }
}
