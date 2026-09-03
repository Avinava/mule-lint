import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parsePropertiesFile } from '../../core/PropertiesParser';
import { isPlaintextSecret } from '../../core/SensitiveKeys';

/**
 * CFG-003: Plaintext Secrets in Properties Files
 *
 * Java `.properties` files under src/main/resources are scanned for sensitive
 * keys holding literal values. A secret committed to the repository is
 * compromised regardless of how the application is deployed.
 *
 * YAML-004 owns `.yaml` and `.yml`; this rule deliberately ignores them so the
 * same file is never reported twice.
 *
 * The finding names the key and the line but never the value.
 */
export class PlaintextPropertiesSecretsRule extends ProjectRule {
  id = 'CFG-003';
  name = 'Plaintext Secrets in Properties Files';
  description = 'Java .properties files should not contain plaintext secret values';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  /** Filenames matching these are already encrypted and are not scanned. */
  private static readonly DEFAULT_SECURE_PATTERNS = ['*secure*'];

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const resourcesPath = path.join(context.projectRoot, 'src/main/resources');

    if (!fs.existsSync(resourcesPath)) {
      return issues;
    }

    const securePatterns = this.getOption(
      context,
      'secureFilePatterns',
      PlaintextPropertiesSecretsRule.DEFAULT_SECURE_PATTERNS,
    );
    const additionalKeys = this.getOption<string[]>(context, 'additionalSensitiveKeys', []);

    const files = fg
      .sync(['**/*.properties'], {
        cwd: resourcesPath,
        onlyFiles: true,
        ignore: ['**/target/**', '**/node_modules/**'],
      })
      .sort();

    for (const file of files) {
      const basename = path.basename(file, '.properties');
      if (this.isExcluded(basename, securePatterns)) {
        continue;
      }

      const relativePath = path.join('src/main/resources', file);

      for (const entry of parsePropertiesFile(path.join(resourcesPath, file))) {
        if (!isPlaintextSecret(entry.key, entry.value, additionalKeys)) {
          continue;
        }

        issues.push(
          this.createLocatedIssue(
            relativePath,
            entry.line,
            `Plaintext secret "${entry.key}" in ${path.basename(file)}`,
            {
              projectRoot: context.projectRoot,
              suggestion: `Replace the literal with \${secure::${entry.key}} and move the value to an encrypted secure properties file`,
            },
          ),
        );
      }
    }

    return issues;
  }
}
