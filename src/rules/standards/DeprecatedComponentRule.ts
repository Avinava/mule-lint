import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-701: Deprecated Component Usage
 *
 * Detect usage of deprecated Mule components.
 */
export class DeprecatedComponentRule extends BaseRule {
    id = 'MULE-701';
    name = 'Deprecated Component Usage';
    description = 'Detect usage of deprecated Mule components';
    severity = 'warning' as const;
    category = 'standards' as const;

    private readonly DEPRECATED_ELEMENTS = [
        { element: 'component', replacement: 'Java module invoke' },
        { element: 'transactional', replacement: 'try scope with transactions' },
        { element: 'poll', replacement: 'scheduler component' },
        { element: 'inbound-endpoint', replacement: 'listener/trigger components' },
        { element: 'outbound-endpoint', replacement: 'requester components' },
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        for (const deprecated of this.DEPRECATED_ELEMENTS) {
            const elements = this.select(`//mule:${deprecated.element}`, doc);

            for (const element of elements) {
                issues.push(
                    this.createIssue(
                        element,
                        `Deprecated component "${deprecated.element}" found`,
                        {
                            suggestion: `Use ${deprecated.replacement} instead`,
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
