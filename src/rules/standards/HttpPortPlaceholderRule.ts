import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * OPS-002: HTTP Port Placeholder
 *
 * HTTP listener ports should use property placeholders, not hardcoded values.
 */
export class HttpPortPlaceholderRule extends BaseRule {
  id = 'OPS-002';
  name = 'HTTP Port Placeholder';
  description = 'HTTP listener ports should use property placeholders';
  severity = 'warning' as const;
  category = 'standards' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Check HTTP listener configurations
    const listenerConfigs = this.select('//*[local-name()="listener-config"]', doc);

    for (const config of listenerConfigs) {
      const port = this.getAttribute(config, 'port');

      if (port && /^\d+$/.test(port)) {
        // Port is a hardcoded number
        const name = this.getNameAttribute(config) ?? 'HTTP Listener Config';
        issues.push(
          this.createIssue(config, `HTTP config "${name}" has hardcoded port "${port}"`, {
            suggestion: 'Use port="${http.port}" or similar placeholder',
          }),
        );
      }
    }

    return issues;
  }
}
