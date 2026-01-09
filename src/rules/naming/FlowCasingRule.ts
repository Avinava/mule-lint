import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-101: Flow Name Casing
 *
 * Flow names should follow consistent casing (kebab-case recommended).
 */
export class FlowCasingRule extends BaseRule {
    id = 'MULE-101';
    name = 'Flow Name Casing';
    description = 'Flow names should follow kebab-case convention';
    severity = 'warning' as const;
    category = 'naming' as const;

    private readonly KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(-flow|-subflow)?$/;

    // APIKit auto-generated flow patterns (HTTP verb:resource:config format)
    private readonly APIKIT_PATTERN = /^(get|post|put|patch|delete|options|head):\\/;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const flows = this.select('//mule:flow | //mule:sub-flow', doc);

        for (const flow of flows) {
            const name = this.getNameAttribute(flow);
            if (!name) continue;

            // Skip APIKit auto-generated flows (e.g., "get:\\healthCheck:tns-billing-papi-config")
            if (this.APIKIT_PATTERN.test(name)) {
                continue;
            }

            if (!this.KEBAB_CASE_PATTERN.test(name)) {
                issues.push(
                    this.createIssue(flow, `Flow name "${name}" should be kebab-case`, {
                        suggestion: `Rename to "${this.toKebabCase(name)}"`,
                    }),
                );
            }
        }

        return issues;
    }

    private toKebabCase(name: string): string {
        return name
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }
}
