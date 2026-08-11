import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { YamlParser } from '../../core/YamlParser';

/**
 * YAML-001: Environment Properties Files
 *
 * Checks that environment-specific YAML files exist.
 *
 * This is a ProjectRule — it runs once per scan to avoid producing
 * N identical issues (one per XML file).
 */
export class EnvironmentFilesRule extends ProjectRule {
  id = 'YAML-001';
  name = 'Environment Properties Files';
  description = 'Environment-specific YAML property files should exist';
  severity = 'warning' as const;
  category = 'standards' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const configDir = path.join(context.projectRoot, 'src/main/resources');
    const configSubDir = path.join(configDir, 'config');
    const propertiesDir = path.join(configDir, 'properties');

    // Check all possible locations for property files
    const searchDirs = [configDir, configSubDir, propertiesDir].filter((d) => fs.existsSync(d));

    if (searchDirs.length === 0) {
      return []; // No config directory found
    }

    const requiredEnvs = this.getOption(context, 'environments', ['dev', 'qa', 'prod']);
    const existingFiles = new Set<string>();

    for (const dir of searchDirs) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach((f) => existingFiles.add(f.toLowerCase()));
      } catch {
        // Directory not readable
      }
    }

    for (const env of requiredEnvs) {
      const hasEnvFile =
        existingFiles.has(`${env}.yaml`) ||
        existingFiles.has(`${env}.yml`) ||
        existingFiles.has(`config-${env}.yaml`) ||
        existingFiles.has(`config-${env}.yml`) ||
        existingFiles.has(`${env}-properties.yaml`);

      if (!hasEnvFile) {
        issues.push(
          this.createProjectIssue(`Missing environment properties file for "${env}"`, {
            suggestion: `Create ${env}.yaml or config-${env}.yaml in src/main/resources/`,
          }),
        );
      }
    }

    return issues;
  }
}

/**
 * YAML-003: Property Naming Convention
 *
 * Property keys should follow category.property format.
 */
export class PropertyNamingRule extends ProjectRule {
  id = 'YAML-003';
  name = 'Property Naming Convention';
  description = 'Property keys should follow category.property format';
  severity = 'info' as const;
  category = 'standards' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const configDir = path.join(context.projectRoot, 'src/main/resources');
    const yamlFiles = this.findYamlFiles(configDir);

    for (const yamlFile of yamlFiles) {
      const content = YamlParser.parseFile(yamlFile);
      if (!content) {
        continue;
      }

      const keys = YamlParser.getAllKeys(content);
      const invalidKeys = keys.filter((key) => !this.isValidPropertyName(key));

      if (invalidKeys.length > 0) {
        issues.push({
          line: 1,
          message: `Invalid property names in ${path.basename(yamlFile)}: ${invalidKeys.slice(0, 3).join(', ')}${invalidKeys.length > 3 ? '...' : ''}`,
          ruleId: this.id,
          severity: this.severity,
          suggestion: 'Use category.property format (e.g., db.host, api.timeout)',
        });
      }
    }

    return issues;
  }

  private isValidPropertyName(key: string): boolean {
    // Valid: db.host, api.client.timeout, http.port, salesforce.authorizationUrl
    // Valid: external-sapi.basepath, ramp.polling.max_retries
    // Valid: netsuite.NSQLPath (uppercase segments for vendor conventions)
    // Invalid: completely random strings without dots (unless single word key)
    //
    // Each segment must start with a letter (any case) and can contain
    // letters, digits, underscores, and hyphens. Segments are separated by dots.
    return (
      /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)+$/.test(key) ||
      /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)
    ); // Single word keys OK too
  }

  private findYamlFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.findYamlFiles(fullPath));
        } else if (YamlParser.isYamlFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory not readable
    }

    return files;
  }
}

/**
 * YAML-004: No Plaintext Secrets
 *
 * Sensitive properties should be encrypted.
 */
export class PlaintextSecretsRule extends ProjectRule {
  id = 'YAML-004';
  name = 'No Plaintext Secrets';
  description = 'Sensitive properties should be encrypted with ![...]';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const configDir = path.join(context.projectRoot, 'src/main/resources');
    const yamlFiles = this.findYamlFiles(configDir);

    for (const yamlFile of yamlFiles) {
      // Skip secure property files (they should be encrypted)
      if (yamlFile.includes('-secure.')) {
        continue;
      }

      const content = YamlParser.parseFile(yamlFile);
      if (!content) {
        continue;
      }

      this.checkForPlaintextSecrets(content, '', yamlFile, issues);
    }

    return issues;
  }

  private checkForPlaintextSecrets(
    obj: Record<string, unknown>,
    prefix: string,
    filePath: string,
    issues: Issue[],
  ): void {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.checkForPlaintextSecrets(value as Record<string, unknown>, fullKey, filePath, issues);
      } else if (typeof value === 'string') {
        if (YamlParser.isSensitiveKey(fullKey) && !YamlParser.isEncryptedValue(value)) {
          // Check if it's a placeholder (OK)
          if (!value.includes('${') && value.length > 0) {
            issues.push({
              line: 1,
              message: `Plaintext secret "${fullKey}" in ${path.basename(filePath)}`,
              ruleId: this.id,
              severity: this.severity,
              suggestion: 'Encrypt value with ![...] or move to secure properties file',
            });
          }
        }
      }
    }
  }

  private findYamlFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.findYamlFiles(fullPath));
        } else if (YamlParser.isYamlFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory not readable
    }

    return files;
  }
}
