import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * DOC-001: Display Name Enforcement
 *
 * Key components should have meaningful doc:name attributes, not defaults.
 */
export class DisplayNameRule extends BaseRule {
    id = 'DOC-001';
    name = 'Display Name Enforcement';
    description = 'Key components should have meaningful display names';
    severity = 'info' as const;
    category = 'documentation' as const;

    // Components that should have meaningful names, with their default names to flag
    private componentDefaults = [
        { element: 'set-payload', defaults: ['Set Payload', 'set-payload'] },
        { element: 'set-variable', defaults: ['Set Variable', 'set-variable'] },
        { element: 'transform', defaults: ['Transform Message', 'transform'] },
        { element: 'flow-ref', defaults: ['Flow Reference', 'flow-ref'] },
        { element: 'logger', defaults: ['Logger', 'logger'] },
        { element: 'choice', defaults: ['Choice', 'choice'] },
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        for (const component of this.componentDefaults) {
            const elements = this.select(`//*[local-name()="${component.element}"]`, doc);

            for (const element of elements) {
                const docName = this.getDocName(element);

                if (!docName) {
                    continue; // Missing doc:name is handled by MULE-604
                }

                // Check if using default name
                if (component.defaults.some((d) => docName.toLowerCase() === d.toLowerCase())) {
                    issues.push(
                        this.createIssue(
                            element,
                            `${component.element} has generic name "${docName}"`,
                            {
                                suggestion: `Use a descriptive name explaining the purpose`,
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}
