import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-102: Variable Naming Convention
 *
 * Variables should follow camelCase naming.
 */
export class VariableNamingRule extends BaseRule {
    id = 'MULE-102';
    name = 'Variable Naming Convention';
    description = 'Variables should follow camelCase naming';
    severity = 'warning' as const;
    category = 'naming' as const;

    private readonly CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const setVariables = this.select('//mule:set-variable', doc);

        for (const setVar of setVariables) {
            const varName = this.getAttribute(setVar, 'variableName');
            if (!varName) continue;

            if (!this.CAMEL_CASE_PATTERN.test(varName)) {
                issues.push(
                    this.createIssue(setVar, `Variable "${varName}" should be camelCase`, {
                        suggestion: `Rename to "${this.toCamelCase(varName)}"`,
                    }),
                );
            }
        }

        return issues;
    }

    private toCamelCase(name: string): string {
        return name
            .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
            .replace(/^[A-Z]/, (c) => c.toLowerCase());
    }
}
