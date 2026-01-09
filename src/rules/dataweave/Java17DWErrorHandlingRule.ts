import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * DW-004: Java 17 DataWeave Error Handling
 *
 * Enforces DataWeave error handling patterns compatible with Java 17 encapsulation.
 */
export class Java17DWErrorHandlingRule extends BaseRule {
    id = 'DW-004';
    name = 'Java 17 DW Error Handling';
    description = 'Use Java 17 compatible DataWeave error handling expressions';
    severity = 'error' as const;
    category = 'dataweave' as const;

    private readonly FORBIDDEN_PATTERNS = [
        {
            pattern: /error\.description\b/g,
            replacement: 'error.detailedDescription',
            message: 'Accessing "error.description" is restricted in Java 17',
        },
        {
            pattern: /error\.errorType\.asString\b/g,
            replacement: 'error.errorType.namespace ++ ":" ++ error.errorType.identifier',
            message: 'Accessing "error.errorType.asString" is restricted in Java 17',
        },
        {
            pattern: /error\.muleMessage\b/g,
            replacement: 'error.errorMessage',
            message: 'Accessing "error.muleMessage" is restricted in Java 17',
        },
        {
            pattern: /error\.errors\b/g,
            replacement: 'error.childErrors',
            message: 'Accessing "error.errors" is restricted in Java 17',
        },
    ];

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // 1. Check external DWL files
        const dwlDir = path.join(context.projectRoot, 'src/main/resources');
        if (fs.existsSync(dwlDir)) {
            const dwlFiles = this.findDwlFiles(dwlDir);
            for (const file of dwlFiles) {
                this.checkFile(file, issues);
            }
        }

        // 2. Check inline DataWeave in XML
        this.checkInlineScripts(doc, issues);

        return issues;
    }

    private checkFile(filePath: string, issues: Issue[]): void {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.checkContent(content, issues, filePath);
        } catch (e) {
            // Ignore read errors
        }
    }

    private checkInlineScripts(doc: Document, issues: Issue[]): void {
        // Check ee:set-payload, ee:set-variable
        const scriptNodes = this.select(
            '//*[local-name()="set-payload" or local-name()="set-variable"]',
            doc,
        );
        for (const node of scriptNodes) {
            const content = node.textContent;
            if (content) {
                this.checkContent(content, issues, undefined, node);
            }
        }

        // Check when attributes in error handlers (on-error-continue/propagate)
        const paramNodes = this.select(
            '//*[local-name()="on-error-continue" or local-name()="on-error-propagate"]',
            doc,
        );
        for (const node of paramNodes) {
            const whenAttr = this.getAttribute(node, 'when');
            if (whenAttr) {
                this.checkContent(whenAttr, issues, undefined, node);
            }
        }
    }

    private checkContent(content: string, issues: Issue[], filePath?: string, node?: Node): void {
        for (const check of this.FORBIDDEN_PATTERNS) {
            // Reset regex lastIndex
            check.pattern.lastIndex = 0;

            // We use matchAll or a loop to find all occurrences
            const matches = content.matchAll(check.pattern);
            for (const match of matches) {
                const index = match.index || 0;
                // Calculate line number for external files
                const line = filePath ? content.substring(0, index).split('\n').length : 1;

                if (filePath) {
                    issues.push({
                        line: line,
                        message: `${check.message} in ${path.basename(filePath)}`,
                        ruleId: this.id,
                        severity: this.severity,
                        suggestion: `Replace with: ${check.replacement}`,
                    });
                } else if (node) {
                    issues.push(
                        this.createIssue(node, check.message, {
                            suggestion: `Replace with: ${check.replacement}`,
                        }),
                    );
                }
            }
        }
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
