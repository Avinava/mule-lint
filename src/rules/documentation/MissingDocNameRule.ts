import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-604: Missing doc:name
 *
 * Key components should have doc:name for Anypoint Studio.
 */
export class MissingDocNameRule extends BaseRule {
    id = 'MULE-604';
    name = 'Missing doc:name';
    description = 'Key components should have doc:name for Anypoint Studio';
    severity = 'warning' as const;
    category = 'documentation' as const;

    private readonly COMPONENTS_REQUIRING_DOC_NAME = [
        'logger',
        'set-variable',
        'set-payload',
        'transform',
        'flow-ref',
        'try',
        'async',
        'choice',
        'scatter-gather',
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        for (const componentName of this.COMPONENTS_REQUIRING_DOC_NAME) {
            const components = this.select(`//mule:${componentName}`, doc);

            for (const component of components) {
                const docName = this.getDocName(component);

                if (!docName || docName.trim() === '') {
                    issues.push(
                        this.createIssue(
                            component,
                            `${componentName} is missing doc:name attribute`,
                            {
                                suggestion: 'Add doc:name="Descriptive Name" for Anypoint Studio',
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}
