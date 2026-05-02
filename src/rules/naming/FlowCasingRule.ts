import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-101: Flow Name Casing
 *
 * Flow names should follow consistent casing.
 * Supports configurable conventions: 'kebab-case' (default), 'camelCase', or 'any'.
 */
export class FlowCasingRule extends BaseRule {
  id = 'MULE-101';
  name = 'Flow Name Casing';
  description = 'Flow names should follow consistent casing convention (kebab-case by default)';
  severity = 'warning' as const;
  category = 'naming' as const;

  private readonly KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(-flow|-subflow)?$/;
  private readonly CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*(Flow|Subflow|SubFlow)?$/;

  // APIKit auto-generated flow patterns (HTTP verb:resource:config format)
  private readonly APIKIT_PATTERN = /^(get|post|put|patch|delete|options|head):\\/;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const convention = this.getOption(context, 'convention', 'kebab-case') as string;

    if (convention === 'any') {
      return issues;
    }

    const flows = this.select('//mule:flow | //mule:sub-flow', doc);

    for (const flow of flows) {
      const name = this.getNameAttribute(flow);
      if (!name) {
        continue;
      }

      // Skip APIKit auto-generated flows (e.g., "get:\\orders:my-api-config")
      if (this.APIKIT_PATTERN.test(name)) {
        continue;
      }

      if (!this.isValidName(name, convention)) {
        issues.push(
          this.createIssue(flow, `Flow name "${name}" should be ${convention}`, {
            suggestion: `Rename to "${this.toConvention(name, convention)}"`,
          }),
        );
      }
    }

    return issues;
  }

  private isValidName(name: string, convention: string): boolean {
    if (convention === 'camelCase') {
      return this.CAMEL_CASE_PATTERN.test(name);
    }
    return this.KEBAB_CASE_PATTERN.test(name);
  }

  private toConvention(name: string, convention: string): string {
    if (convention === 'camelCase') {
      return name
        .split('-')
        .map((part, i) =>
          i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join('');
    }
    return name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
