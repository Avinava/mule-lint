import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-501: Scatter-Gather Route Count
 *
 * Scatter-gather with many routes may cause memory issues.
 */
export class ScatterGatherRoutesRule extends BaseRule {
    id = 'MULE-501';
    name = 'Scatter-Gather Route Count';
    description = 'Scatter-gather with many routes may cause memory issues';
    severity = 'info' as const;
    category = 'performance' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const maxRoutes = this.getOption(context, 'maxRoutes', 5);

        const scatterGathers = this.select('//mule:scatter-gather', doc);

        for (const sg of scatterGathers) {
            const routes = this.select('./mule:route', sg as Document);

            if (routes.length > maxRoutes) {
                issues.push(
                    this.createIssue(
                        sg,
                        `Scatter-gather has ${routes.length} routes (max recommended: ${maxRoutes})`,
                        {
                            suggestion:
                                'Consider using batch processing for large parallel operations',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
