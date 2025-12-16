import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * EXP-001: Flow Reference Depth
 * 
 * Limit the depth of flow-ref chains.
 */
export class FlowRefDepthRule extends BaseRule {
    id = 'EXP-001';
    name = 'Flow Reference Depth';
    description = 'Limit flow-ref chain depth to avoid complexity';
    severity = 'info' as const;
    category = 'experimental' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const maxDepth = this.getOption(context, 'maxDepth', 5);

        const flows = this.select('//mule:flow | //mule:sub-flow', doc);

        for (const flow of flows) {
            const flowRefs = this.select('.//mule:flow-ref', flow as Document);

            if (flowRefs.length > maxDepth) {
                const name = this.getNameAttribute(flow) ?? 'unnamed';
                issues.push(this.createIssue(
                    flow,
                    `Flow "${name}" has ${flowRefs.length} flow-refs (max: ${maxDepth})`,
                    { suggestion: 'Consider consolidating or reducing flow-ref usage' }
                ));
            }
        }

        return issues;
    }
}

/**
 * EXP-002: Connector Config Naming
 * 
 * Connector configurations should follow naming convention.
 */
export class ConnectorConfigNamingRule extends BaseRule {
    id = 'EXP-002';
    name = 'Connector Config Naming';
    description = 'Connector configurations should follow naming conventions';
    severity = 'info' as const;
    category = 'experimental' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find all config elements
        const configs = this.select('//*[contains(local-name(), "-config") or contains(local-name(), "_config")]', doc);

        for (const config of configs) {
            const name = this.getNameAttribute(config);

            if (name && !this.isValidConfigName(name)) {
                issues.push(this.createIssue(
                    config,
                    `Config "${name}" should follow Convention_Type pattern`,
                    { suggestion: 'Use pattern: HTTP_Request_Config, Database_Config' }
                ));
            }
        }

        return issues;
    }

    private isValidConfigName(name: string): boolean {
        // Valid patterns: HTTP_Request_Config, Salesforce_Config, etc.
        return /^[A-Z][a-zA-Z0-9]*(_[A-Z][a-zA-Z0-9]*)*$/.test(name);
    }
}

/**
 * EXP-003: MUnit Test Coverage
 * 
 * Check for MUnit test files.
 */
export class MUnitCoverageRule extends BaseRule {
    id = 'EXP-003';
    name = 'MUnit Coverage';
    description = 'Flows should have corresponding MUnit tests';
    severity = 'info' as const;
    category = 'experimental' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const flows = this.select('//mule:flow', doc);
        const munitDir = `${context.projectRoot}/src/test/munit`;

        // Check if MUnit directory exists (basic check)
        const fs = require('fs');
        if (!fs.existsSync(munitDir)) {
            if (flows.length > 0) {
                issues.push({
                    line: 1,
                    message: `Project has ${flows.length} flows but no MUnit tests`,
                    ruleId: this.id,
                    severity: this.severity,
                    suggestion: 'Create src/test/munit/ directory with test files'
                });
            }
        }

        return issues;
    }
}
