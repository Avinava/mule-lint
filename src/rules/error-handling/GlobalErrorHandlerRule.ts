import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { fileExists } from '../../core/FileScanner';
import * as path from 'path';

/**
 * MULE-001: Global Error Handler Exists
 * 
 * Every Mule project should have a global error handler file with a 
 * reusable error-handler configuration.
 */
export class GlobalErrorHandlerRule extends BaseRule {
    id = 'MULE-001';
    name = 'Global Error Handler Exists';
    description = 'Project should have a global error handler configuration for consistent error handling';
    severity = 'error' as const;
    category = 'error-handling' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get configurable file path
        const expectedFile = this.getOption(
            context,
            'filePath',
            'src/main/mule/global-error-handler.xml'
        );

        const fullPath = path.join(context.projectRoot, expectedFile);

        // Only check once per project (check if this is the main config file or first file)
        // We'll trigger this check on any XML file but only report if the file doesn't exist
        if (!fileExists(fullPath)) {
            // Check if current file could serve as global error handler
            const hasGlobalErrorHandler = this.exists(
                '//mule:error-handler[@name="global-error-handler"]',
                doc
            );

            // If current file has a global-error-handler, that's acceptable
            if (!hasGlobalErrorHandler) {
                // Check if any error-handler with ref to global exists
                const hasGlobalRef = this.exists(
                    '//mule:flow/mule:error-handler[@ref="global-error-handler"]',
                    doc
                );

                if (!hasGlobalRef && context.relativePath.includes('global')) {
                    issues.push(this.createFileIssue(
                        `Global error handler configuration not found at "${expectedFile}"`,
                        {
                            suggestion: 'Create a global-error-handler.xml file with a named error-handler element'
                        }
                    ));
                }
            }
        }

        return issues;
    }
}
