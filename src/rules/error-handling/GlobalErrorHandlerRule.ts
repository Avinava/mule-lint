import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { fileExists } from '../../core/FileScanner';
import * as path from 'path';
import * as fs from 'fs';

/**
 * MULE-001: Global Error Handler Exists
 *
 * Every Mule project should have a global error handler: either a dedicated
 * file (default: global-error-handler.xml) OR any XML file in the project
 * that contains a named <error-handler> element.
 *
 * This is a ProjectRule — it runs once per scan (not per file). It scans all
 * XML files in the Mule source directory looking for a named error-handler
 * definition. If none is found and the expected file doesn't exist, it reports
 * a single project-level issue.
 */
export class GlobalErrorHandlerRule extends ProjectRule {
  id = 'MULE-001';
  name = 'Global Error Handler Exists';
  description =
    'Project should have a global error handler configuration for consistent error handling';
  severity = 'warning' as const;
  category = 'error-handling' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    // Get configurable expected file path
    const expectedFile = this.getOption(
      context,
      'filePath',
      'src/main/mule/global-error-handler.xml',
    );

    const fullPath = path.join(context.projectRoot, expectedFile);

    // 1. If the dedicated global error handler file exists, the project
    //    satisfies the rule.
    if (fileExists(fullPath)) {
      return [];
    }

    // 2. Scan all XML files in src/main/mule for a named <error-handler>
    //    element or an <error-handler ref="..."> reference.
    const muleDir = path.join(context.projectRoot, 'src/main/mule');
    if (fs.existsSync(muleDir)) {
      const hasErrorHandler = this.scanForErrorHandler(muleDir);
      if (hasErrorHandler) {
        return [];
      }
    }

    return [
      this.createProjectIssue(
        `Global error handler configuration not found. Expected "${expectedFile}" or a named <error-handler> element in any Mule XML file.`,
        {
          suggestion:
            'Create a global-error-handler.xml file with a named <error-handler> element, or add an <error-handler name="..."> to an existing configuration file',
        },
      ),
    ];
  }

  /**
   * Recursively scan a directory for XML files containing a named
   * <error-handler> or <error-handler ref="..."> element.
   */
  private scanForErrorHandler(dir: string): boolean {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (this.scanForErrorHandler(fullPath)) {
            return true;
          }
        } else if (entry.name.endsWith('.xml')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Quick string check before full parse — avoids parsing every file
            if (
              content.includes('error-handler') &&
              (/<error-handler\s[^>]*name\s*=/.test(content) ||
                /<error-handler\s[^>]*ref\s*=/.test(content))
            ) {
              return true;
            }
          } catch {
            // Unreadable file, skip
          }
        }
      }
    } catch {
      // Unreadable directory
    }
    return false;
  }
}
