import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-002: Flow Naming Convention
 * 
 * Flows must end with "-flow" suffix, sub-flows with "-subflow".
 * This ensures consistent naming across the project.
 */
export class FlowNamingRule extends BaseRule {
    id = 'MULE-002';
    name = 'Flow Naming Convention';
    description = 'Flows should end with "-flow", sub-flows with "-subflow" for consistent naming';
    severity = 'warning' as const;
    category = 'naming' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get configurable suffixes
        const flowSuffix = this.getOption(context, 'flowSuffix', '-flow');
        const subflowSuffix = this.getOption(context, 'subflowSuffix', '-subflow');
        const excludePatterns = this.getOption<string[]>(context, 'excludePatterns', [
            '*-api-main',
            '*-main', // Common pattern for main flows
            '*-api-console',
            // APIKit auto-generated flow patterns (HTTP verb:resource:config format)
            'get:*',
            'post:*',
            'put:*',
            'patch:*',
            'delete:*',
            'options:*',
            'head:*',
        ]);

        // Check flows
        const flows = this.select('//mule:flow', doc);
        for (const flow of flows) {
            const name = this.getNameAttribute(flow);
            if (!name) {
                continue;
            }

            // Skip excluded patterns
            if (this.isExcluded(name, excludePatterns)) {
                continue;
            }

            if (!name.endsWith(flowSuffix)) {
                issues.push(this.createIssue(
                    flow,
                    `Flow "${name}" should end with "${flowSuffix}"`,
                    { suggestion: `Rename to "${name}${flowSuffix}"` }
                ));
            }
        }

        // Check sub-flows
        const subflows = this.select('//mule:sub-flow', doc);
        for (const subflow of subflows) {
            const name = this.getNameAttribute(subflow);
            if (!name) {
                continue;
            }

            // Skip excluded patterns
            if (this.isExcluded(name, excludePatterns)) {
                continue;
            }

            if (!name.endsWith(subflowSuffix)) {
                issues.push(this.createIssue(
                    subflow,
                    `Sub-flow "${name}" should end with "${subflowSuffix}"`,
                    { suggestion: `Rename to "${name}${subflowSuffix}"` }
                ));
            }
        }

        return issues;
    }
}
