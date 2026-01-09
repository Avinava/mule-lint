import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * DW-001: External DWL for Complex Transforms
 *
 * Complex DataWeave transforms should be in external .dwl files.
 */
export class ExternalDwlRule extends BaseRule {
    id = 'DW-001';
    name = 'External DWL for Complex Transforms';
    description = 'Complex DataWeave should be externalized to .dwl files';
    severity = 'warning' as const;
    category = 'dataweave' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const maxInlineLines = this.getOption(context, 'maxInlineLines', 10);

        // Find all transform components
        const transforms = this.select('//*[local-name()="transform"]', doc);

        for (const transform of transforms) {
            const setPayload = this.select(
                './/*[local-name()="set-payload"]',
                transform as Document,
            );

            for (const payload of setPayload) {
                const content = payload.textContent ?? '';
                const lines = content.split('\n').filter((l) => l.trim().length > 0);

                if (lines.length > maxInlineLines) {
                    const docName = this.getDocName(transform) ?? 'Transform';
                    issues.push(
                        this.createIssue(
                            transform,
                            `Transform "${docName}" has ${lines.length} lines - externalize to .dwl file`,
                            {
                                suggestion: `Move to src/main/resources/dwl/ and use: resource("dwl/transform-name.dwl")`,
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}

/**
 * DW-002: DWL File Naming Convention
 *
 * DataWeave files should follow naming convention.
 */
export class DwlNamingRule extends BaseRule {
    id = 'DW-002';
    name = 'DWL File Naming';
    description = 'DataWeave files should follow naming conventions';
    severity = 'info' as const;
    category = 'dataweave' as const;

    validate(_doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const dwlDir = path.join(context.projectRoot, 'src/main/resources/dwl');

        if (!fs.existsSync(dwlDir)) return issues;

        const dwlFiles = this.findDwlFiles(dwlDir);

        for (const file of dwlFiles) {
            const basename = path.basename(file, '.dwl');

            if (!this.isValidDwlName(basename)) {
                issues.push({
                    line: 1,
                    message: `DWL file "${basename}.dwl" should use kebab-case naming`,
                    ruleId: this.id,
                    severity: this.severity,
                    suggestion: 'Rename to kebab-case: my-transform.dwl',
                });
            }
        }

        return issues;
    }

    private isValidDwlName(name: string): boolean {
        return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
    }

    private findDwlFiles(dir: string): string[] {
        const files: string[] = [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.findDwlFiles(fullPath));
                } else if (entry.name.endsWith('.dwl')) {
                    files.push(fullPath);
                }
            }
        } catch {
            // Directory not readable
        }
        return files;
    }
}

/**
 * DW-003: DWL Modules Usage
 *
 * Common DataWeave functions should be in reusable modules.
 */
export class DwlModulesRule extends BaseRule {
    id = 'DW-003';
    name = 'DWL Modules';
    description = 'Project should have common DataWeave modules';
    severity = 'info' as const;
    category = 'dataweave' as const;

    validate(_doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const dwlDir = path.join(context.projectRoot, 'src/main/resources/dwl');

        if (!fs.existsSync(dwlDir)) return issues;

        const hasCommonModule = this.hasFile(dwlDir, 'common');
        const hasUtilsModule = this.hasFile(dwlDir, 'utils');

        if (!hasCommonModule && !hasUtilsModule) {
            issues.push({
                line: 1,
                message: 'No common/utils DWL module found',
                ruleId: this.id,
                severity: this.severity,
                suggestion: 'Create common.dwl or utils.dwl for reusable functions',
            });
        }

        return issues;
    }

    private hasFile(dir: string, pattern: string): boolean {
        try {
            const files = fs.readdirSync(dir);
            return files.some((f) => f.toLowerCase().includes(pattern));
        } catch {
            return false;
        }
    }
}
