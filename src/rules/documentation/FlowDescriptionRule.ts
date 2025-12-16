import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-601: Flow Missing Description
 * 
 * Flows should have doc:description for documentation.
 */
export class FlowDescriptionRule extends BaseRule {
    id = 'MULE-601';
    name = 'Flow Missing Description';
    description = 'Flows should have doc:description for documentation';
    severity = 'info' as const;
    category = 'documentation' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find flows without description
        const flows = this.select('//mule:flow', doc);

        for (const flow of flows) {
            const description = this.getAttribute(flow, 'doc:description');
            const name = this.getNameAttribute(flow) ?? 'unnamed';

            if (!description || description.trim() === '') {
                issues.push(this.createIssue(
                    flow,
                    `Flow "${name}" is missing doc:description`,
                    {
                        suggestion: 'Add doc:description="Description of what this flow does"'
                    }
                ));
            }
        }

        return issues;
    }
}
