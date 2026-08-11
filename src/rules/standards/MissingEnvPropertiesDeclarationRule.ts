import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CFG-002: Missing Environment Properties Declaration
 *
 * Projects using configuration-properties with environment placeholders
 * (e.g., ${mule.env}.yaml) should have at least dev and prod property files.
 * Missing environment files cause deployment failures.
 *
 * Checks that for each pattern like `${mule.env}.yaml`, the project has
 * at minimum: dev.yaml and prod.yaml (or the equivalent with the pattern).
 */
export class MissingEnvPropertiesDeclarationRule extends ProjectRule {
  id = 'CFG-002';
  name = 'Missing Environment Properties';
  description =
    'Projects with environment-parameterized configs must have dev and prod property files';
  severity = 'warning' as const;
  category = 'standards' as const;
  override issueType: IssueType = 'bug';

  /** Required environments */
  private readonly REQUIRED_ENVS = ['dev', 'prod'];

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const resourceDir = path.join(context.projectRoot, 'src', 'main', 'resources');

    if (!fs.existsSync(resourceDir)) {
      return issues; // Not a standard Mule project layout
    }

    // Look for YAML files in the resources directory
    const files = this.listFiles(resourceDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

    // Check if any file looks like an env-parameterized name
    // Common patterns: dev.yaml, prod.yaml, local.yaml, sandbox.yaml
    const envFilePattern = /^(dev|prod|local|sandbox|qa|staging|uat|sit)\.(yaml|yml)$/;
    const envFilesFound = yamlFiles
      .map((f) => path.basename(f))
      .filter((f) => envFilePattern.test(f));

    // If there are env files, check that both dev and prod exist
    if (envFilesFound.length > 0) {
      for (const requiredEnv of this.REQUIRED_ENVS) {
        const hasEnv = envFilesFound.some((f) => f.startsWith(`${requiredEnv}.`));
        if (!hasEnv) {
          issues.push(
            this.createProjectIssue(
              `Missing ${requiredEnv}.yaml property file — project has environment-specific configs but no ${requiredEnv} environment`,
              {
                suggestion: `Create src/main/resources/${requiredEnv}.yaml with environment-specific properties`,
              },
            ),
          );
        }
      }
    }

    // Also check for secure property files if secure-*.yaml pattern is used
    const secureFiles = yamlFiles
      .map((f) => path.basename(f))
      .filter((f) => f.startsWith('secure-'));
    if (secureFiles.length > 0) {
      for (const requiredEnv of this.REQUIRED_ENVS) {
        const hasSecureEnv = secureFiles.some(
          (f) => f === `secure-${requiredEnv}.yaml` || f === `secure-${requiredEnv}.yml`,
        );
        if (!hasSecureEnv) {
          issues.push(
            this.createProjectIssue(
              `Missing secure-${requiredEnv}.yaml — project uses secure properties but no ${requiredEnv} secure config`,
              {
                suggestion: `Create src/main/resources/secure-${requiredEnv}.yaml with encrypted secrets for the ${requiredEnv} environment`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }

  private listFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir).map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  }
}
