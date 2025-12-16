import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { fileExists } from '../../core/FileScanner';
import * as path from 'path';

/**
 * MULE-010: DWL Standards File
 * 
 * Project should have standard DataWeave files for common operations
 * like error responses, transformations, etc.
 */
export class DwlStandardsRule extends BaseRule {
    id = 'MULE-010';
    name = 'DWL Standards File';
    description = 'Project should have standard DataWeave files for consistent error responses';
    severity = 'info' as const;
    category = 'standards' as const;

    // Track if we've already checked (to avoid duplicate warnings)
    private static checkedProjects = new Set<string>();

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Only check once per project
        if (DwlStandardsRule.checkedProjects.has(context.projectRoot)) {
            return issues;
        }

        // Get expected DWL files from config
        const expectedFiles = this.getOption<string[]>(context, 'expectedFiles', [
            'src/main/resources/dwl/standard-error.dwl',
            'src/main/resources/dwl/common-functions.dwl',
        ]);

        // Check if any expected files are missing
        const missingFiles: string[] = [];
        for (const expectedFile of expectedFiles) {
            const fullPath = path.join(context.projectRoot, expectedFile);
            if (!fileExists(fullPath)) {
                missingFiles.push(expectedFile);
            }
        }

        if (missingFiles.length > 0) {
            // Mark as checked to avoid duplicate warnings
            DwlStandardsRule.checkedProjects.add(context.projectRoot);

            issues.push(this.createFileIssue(
                `Recommended DataWeave standards files not found: ${missingFiles.join(', ')}`,
                {
                    suggestion: 'Create standard DWL files for consistent error responses and common functions'
                }
            ));
        }

        return issues;
    }

    /**
     * Reset the checked projects cache (for testing)
     */
    public static reset(): void {
        DwlStandardsRule.checkedProjects.clear();
    }
}
