import { ValidationContext, Issue } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { fileExists } from '../../core/FileScanner';
import * as path from 'path';

/**
 * MULE-010: DWL Standards File
 *
 * Project should have standard DataWeave files for common operations
 * like error responses, transformations, etc.
 */
export class DwlStandardsRule extends ProjectRule {
  id = 'MULE-010';
  name = 'DWL Standards File';
  description = 'Project should have standard DataWeave files for consistent error responses';
  severity = 'info' as const;
  category = 'standards' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Get expected DWL files from config
    const expectedFiles = this.getOption(context, 'expectedFiles', [
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
      issues.push(
        this.createProjectIssue(
          `Recommended DataWeave standards files not found: ${missingFiles.join(', ')}`,
          {
            suggestion:
              'Create standard DWL files for consistent error responses and common functions',
          },
        ),
      );
    }

    return issues;
  }
}
