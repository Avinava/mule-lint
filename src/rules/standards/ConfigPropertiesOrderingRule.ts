import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * CFG-001: Configuration Properties Ordering
 *
 * Mule configuration-properties elements should be loaded in the correct
 * order: global defaults first, then environment-specific overrides, then
 * secure properties. This ensures predictable property resolution (Mule
 * uses last-wins for overlapping keys).
 *
 * Expected ordering pattern:
 *   1. config/global.yaml (or common.yaml, defaults.yaml)
 *   2. config/${mule.env}.yaml (environment-specific)
 *   3. secure-properties:config (encrypted secrets)
 *   4. entity-config/*.yaml (optional, additive)
 *
 * This rule flags when env-specific properties appear before global
 * defaults, which would cause globals to override env-specific values.
 */
export class ConfigPropertiesOrderingRule extends BaseRule {
  id = 'CFG-001';
  name = 'Configuration Properties Ordering';
  description =
    'Configuration properties should be loaded in correct order: global before environment-specific';
  severity = 'info' as const;
  category = 'standards' as const;

  /** Patterns that identify global/default property files */
  private readonly GLOBAL_PATTERNS = [
    'global.yaml',
    'global.properties',
    'common.yaml',
    'common.properties',
    'defaults.yaml',
    'defaults.properties',
  ];

  /** Patterns that identify env-specific property files */
  private readonly ENV_PATTERNS = ['${mule.env}', '${env}', '${mule.environment}'];

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find all configuration-properties elements in document order
    const configProps = this.select('//*[local-name()="configuration-properties"]', doc);

    if (configProps.length < 2) {
      return issues; // Not enough elements to have ordering issues
    }

    let globalIndex = -1;
    let envIndex = -1;

    for (const [index, configProperty] of configProps.entries()) {
      const file = this.getAttribute(configProperty, 'file') ?? '';
      const fileLower = file.toLowerCase();

      if (this.isGlobalFile(fileLower)) {
        globalIndex = index;
      }

      if (this.isEnvSpecificFile(file)) {
        if (envIndex === -1) {
          envIndex = index; // Track the first env-specific file
        }
      }
    }

    // Flag if env-specific appears before global defaults
    if (globalIndex >= 0 && envIndex >= 0 && envIndex < globalIndex) {
      const environmentProperty = configProps[envIndex];
      if (!environmentProperty) {
        return issues;
      }
      issues.push(
        this.createIssue(
          environmentProperty,
          'Environment-specific properties file is loaded before global defaults',
          {
            suggestion:
              'Load global/common properties first (e.g., config/global.yaml) before environment-specific files (e.g., config/${mule.env}.yaml) to ensure correct override behavior',
          },
        ),
      );
    }

    return issues;
  }

  private isGlobalFile(fileLower: string): boolean {
    return this.GLOBAL_PATTERNS.some((p) => fileLower.includes(p));
  }

  private isEnvSpecificFile(file: string): boolean {
    return this.ENV_PATTERNS.some((p) => file.includes(p));
  }
}
