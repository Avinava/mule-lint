import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { ComplexityCalculator } from '../../core/ComplexityCalculator';

/**
 * MULE-801: Flow Complexity
 * 
 * Warns if flow cyclomatic complexity exceeds threshold.
 */
export class FlowComplexityRule extends BaseRule {
    id = 'MULE-801';
    name = 'Flow Complexity';
    description = 'Flow cyclomatic complexity should not exceed threshold';
    severity = 'warning' as const;
    category = 'complexity' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const warnThreshold = this.getOption(context, 'warnThreshold', 10);
        const errorThreshold = this.getOption(context, 'errorThreshold', 20);

        // Find all flows and sub-flows
        const flows = this.select('//mule:flow | //mule:sub-flow', doc);

        for (const flow of flows) {
            const flowName = this.getNameAttribute(flow) ?? 'unnamed';
            const result = ComplexityCalculator.calculateFlowComplexity(flow);

            if (result.complexity > errorThreshold) {
                issues.push({
                    line: this.getLine(flow),
                    message: `Flow "${flowName}" has high complexity (${result.complexity}) - refactor recommended`,
                    ruleId: this.id,
                    severity: 'error',
                    suggestion: this.formatSuggestion(result)
                });
            } else if (result.complexity > warnThreshold) {
                issues.push({
                    line: this.getLine(flow),
                    message: `Flow "${flowName}" has moderate complexity (${result.complexity})`,
                    ruleId: this.id,
                    severity: 'warning',
                    suggestion: this.formatSuggestion(result)
                });
            }
        }

        return issues;
    }

    private formatSuggestion(result: { details: { type: string; count: number }[] }): string {
        const breakdown = result.details
            .map(d => `${d.type}: ${d.count}`)
            .join(', ');
        return `Complexity breakdown: ${breakdown}. Consider extracting to sub-flows.`;
    }

    private getLine(node: Node): number {
        return ComplexityCalculator.getNodeLine(node);
    }
}
