import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-802: Project Structure Validation
 *
 * Validates standard MuleSoft project folder structure.
 */
export class ProjectStructureRule extends BaseRule {
    id = 'MULE-802';
    name = 'Project Structure';
    description = 'Validate standard MuleSoft project folder structure';
    severity = 'warning' as const;
    category = 'structure' as const;

    private readonly REQUIRED_DIRS = ['src/main/mule', 'src/main/resources'];

    private readonly RECOMMENDED_DIRS = [
        'src/main/resources/dwl',
        'src/main/resources/api',
        'src/test/munit',
    ];

    validate(_doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const projectRoot = context.projectRoot;

        // Check required directories
        for (const dir of this.REQUIRED_DIRS) {
            const fullPath = path.join(projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                issues.push({
                    line: 1,
                    message: `Missing required directory: ${dir}`,
                    ruleId: this.id,
                    severity: 'error',
                    suggestion: `Create directory: mkdir -p ${dir}`,
                });
            }
        }

        // Check recommended directories
        for (const dir of this.RECOMMENDED_DIRS) {
            const fullPath = path.join(projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                issues.push({
                    line: 1,
                    message: `Missing recommended directory: ${dir}`,
                    ruleId: this.id,
                    severity: 'info',
                    suggestion: `Consider creating: ${dir}`,
                });
            }
        }

        return issues;
    }
}

/**
 * MULE-803: Global Config File
 *
 * Project should have global configuration file.
 */
export class GlobalConfigRule extends BaseRule {
    id = 'MULE-803';
    name = 'Global Config File';
    description = 'Project should have global.xml with shared configurations';
    severity = 'warning' as const;
    category = 'structure' as const;

    validate(_doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const muleDir = path.join(context.projectRoot, 'src/main/mule');

        if (!fs.existsSync(muleDir)) return issues;

        const hasGlobalConfig = this.findGlobalConfig(muleDir);

        if (!hasGlobalConfig) {
            issues.push({
                line: 1,
                message: 'Missing global.xml configuration file',
                ruleId: this.id,
                severity: this.severity,
                suggestion: 'Create src/main/mule/global.xml for shared configurations',
            });
        }

        return issues;
    }

    private findGlobalConfig(dir: string): boolean {
        try {
            const files = fs.readdirSync(dir);
            return files.some((f) => f.toLowerCase().includes('global') && f.endsWith('.xml'));
        } catch {
            return false;
        }
    }
}

/**
 * MULE-804: Monolithic XML File
 *
 * XML files should not be too large.
 */
export class MonolithicXmlRule extends BaseRule {
    id = 'MULE-804';
    name = 'Monolithic XML File';
    description = 'XML files should not exceed recommended line count';
    severity = 'warning' as const;
    category = 'structure' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const maxLines = this.getOption(context, 'maxLines', 500);

        // Count flows and sub-flows as proxy for complexity
        const flows = this.select('//mule:flow', doc);
        const subFlows = this.select('//mule:sub-flow', doc);
        const totalFlows = flows.length + subFlows.length;

        if (totalFlows > 10) {
            issues.push({
                line: 1,
                message: `File has ${totalFlows} flows/sub-flows - consider splitting`,
                ruleId: this.id,
                severity: this.severity,
                suggestion: 'Split into multiple XML files by domain or function',
            });
        }

        return issues;
    }
}
