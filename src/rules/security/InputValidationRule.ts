import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-004: Input Validation Check
 *
 * Incoming payloads should be validated using JSON or XML schema validation
 * to prevent injection attacks and malformed data processing.
 */
export class InputValidationRule extends BaseRule {
    id = 'SEC-004';
    name = 'Input Validation';
    description = 'Incoming payloads should be validated with schema validation';
    severity = 'warning' as const;
    category = 'security' as const;
    issueType: IssueType = 'vulnerability';

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Skip non-interface files
        if (!context.relativePath.includes('interface') && !context.relativePath.includes('impl')) {
            return issues;
        }

        // Find HTTP listeners that accept POST/PUT/PATCH
        const flows = this.select('//*[local-name()="flow"]', doc);

        for (const flow of flows) {
            const flowElement = flow as Element;
            const flowName = flowElement.getAttribute('name') || '';

            // Check if flow has HTTP listener with body-accepting methods
            const listeners = this.select('.//*[local-name()="listener"]', flow);

            if (listeners.length === 0) continue;

            // Check for POST, PUT, PATCH patterns in flow name (APIKit generated)
            const acceptsBody =
                flowName.includes('post:') ||
                flowName.includes('put:') ||
                flowName.includes('patch:');

            if (!acceptsBody) continue;

            // Check for validation in the flow
            const hasValidation =
                this.select(
                    './/*[local-name()="validate-schema" or local-name()="json-schema-validator" or local-name()="schema-validator" or contains(local-name(), "validation")]',
                    flow,
                ).length > 0;

            // Check for DataWeave validation patterns
            const transforms = this.select('.//*[local-name()="transform"]', flow);
            let hasInlineValidation = false;
            for (const transform of transforms) {
                const content = (transform as Element).textContent || '';
                if (content.includes('validate') || content.includes('match')) {
                    hasInlineValidation = true;
                    break;
                }
            }

            if (!hasValidation && !hasInlineValidation) {
                issues.push(
                    this.createIssue(
                        flow,
                        `Flow "${flowName}" accepts request body but has no input validation`,
                        {
                            suggestion:
                                'Add JSON/XML schema validation or DataWeave validation to prevent injection attacks',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}
