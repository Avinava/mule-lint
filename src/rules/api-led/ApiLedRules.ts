import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * API-001: Experience Layer Pattern
 * 
 * Experience layer APIs should follow naming conventions.
 */
export class ExperienceLayerRule extends BaseRule {
    id = 'API-001';
    name = 'Experience Layer Pattern';
    description = 'Experience layer APIs should follow naming conventions';
    severity = 'info' as const;
    category = 'api-led' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const flows = this.select('//mule:flow', doc);

        for (const flow of flows) {
            const name = this.getNameAttribute(flow) ?? '';

            // Check if it looks like an experience API (has -exp- or -experience-)
            if (name.includes('-exp-') || name.includes('-experience-')) {
                // Experience APIs should have HTTP listener
                const hasListener = this.select('.//http:listener', flow as Document).length > 0 ||
                    this.select('.//*[local-name()="listener"]', flow as Document).length > 0;

                if (!hasListener) {
                    issues.push(this.createIssue(
                        flow,
                        `Experience API "${name}" should have HTTP listener`,
                        { suggestion: 'Add HTTP listener for API entry point' }
                    ));
                }
            }
        }

        return issues;
    }
}

/**
 * API-002: Process Layer Pattern
 * 
 * Process layer should orchestrate, not contain business logic.
 */
export class ProcessLayerRule extends BaseRule {
    id = 'API-002';
    name = 'Process Layer Pattern';
    description = 'Process layer should orchestrate other APIs';
    severity = 'info' as const;
    category = 'api-led' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const flows = this.select('//mule:flow', doc);

        for (const flow of flows) {
            const name = this.getNameAttribute(flow) ?? '';

            // Check if it's a process layer API
            if (name.includes('-proc-') || name.includes('-process-')) {
                // Process layer should have flow-refs or HTTP requests
                const hasFlowRef = this.select('.//mule:flow-ref', flow as Document).length > 0;
                const hasHttpRequest = this.select('.//*[local-name()="request"]', flow as Document).length > 0;

                if (!hasFlowRef && !hasHttpRequest) {
                    issues.push(this.createIssue(
                        flow,
                        `Process layer "${name}" should orchestrate other services`,
                        { suggestion: 'Add flow-ref or HTTP request to system/experience APIs' }
                    ));
                }
            }
        }

        return issues;
    }
}

/**
 * API-003: System Layer Pattern
 * 
 * System layer should connect to external systems.
 */
export class SystemLayerRule extends BaseRule {
    id = 'API-003';
    name = 'System Layer Pattern';
    description = 'System layer should connect to external systems';
    severity = 'info' as const;
    category = 'api-led' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const flows = this.select('//mule:flow', doc);

        for (const flow of flows) {
            const name = this.getNameAttribute(flow) ?? '';

            // Check if it's a system layer API
            if (name.includes('-sys-') || name.includes('-system-')) {
                // System layer should have database, HTTP, or other connectors
                const hasDbOp = this.select('.//*[local-name()="select" or local-name()="insert" or local-name()="update" or local-name()="delete"]', flow as Document).length > 0;
                const hasHttpRequest = this.select('.//*[local-name()="request"]', flow as Document).length > 0;

                if (!hasDbOp && !hasHttpRequest) {
                    issues.push(this.createIssue(
                        flow,
                        `System layer "${name}" should connect to external systems`,
                        { suggestion: 'Add database, HTTP, or other connector operations' }
                    ));
                }
            }
        }

        return issues;
    }
}
