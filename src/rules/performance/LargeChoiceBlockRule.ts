import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-503: Large Choice Blocks
 *
 * Choice blocks with many when clauses should be refactored.
 */
export class LargeChoiceBlockRule extends BaseRule {
    id = 'MULE-503';
    name = 'Large Choice Blocks';
    description = 'Choice blocks with many when clauses should be refactored';
    severity = 'warning' as const;
    category = 'performance' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const maxWhenClauses = this.getOption(context, 'maxWhenClauses', 7);

        const choices = this.select('//mule:choice', doc);

        for (const choice of choices) {
            const whenClauses = this.select('./mule:when', choice as Document);

            if (whenClauses.length > maxWhenClauses) {
                issues.push(
                    this.createIssue(
                        choice,
                        `Choice has ${whenClauses.length} when clauses (max recommended: ${maxWhenClauses})`,
                        {
                            suggestion:
                                'Consider using DataWeave lookup table or flow-ref with dynamic routing',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
