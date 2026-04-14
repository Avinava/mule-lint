import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { fileExists } from '../../core/FileScanner';
import * as path from 'path';

/**
 * MULE-001: Global Error Handler Exists
 *
 * Every Mule project should have a global error handler: either a dedicated
 * file (default: global-error-handler.xml) OR any scanned XML file that
 * contains a named <error-handler> element.
 *
 * The rule fires on every scanned XML file that:
 *   1. Contains at least one <flow> or <sub-flow> (is a flow file), AND
 *   2. Does not itself define an <error-handler> element
 *
 * If neither the expected file exists NOR any named <error-handler> has been
 * found in the current document, an issue is raised.
 *
 * Note: the old guard `context.relativePath.includes('global')` has been
 * removed.  Restricting reports to only "global" files hid the rule for
 * projects that did not follow that naming convention.
 */
export class GlobalErrorHandlerRule extends BaseRule {
  id = 'MULE-001';
  name = 'Global Error Handler Exists';
  description =
    'Project should have a global error handler configuration for consistent error handling';
  severity = 'warning' as const;
  category = 'error-handling' as const;
  issueType: IssueType = 'bug';

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Get configurable expected file path
    const expectedFile = this.getOption(
      context,
      'filePath',
      'src/main/mule/global-error-handler.xml',
    );

    const fullPath = path.join(context.projectRoot, expectedFile);

    // If the dedicated global error handler file exists, the project satisfies
    // the rule regardless of what is in the current file.
    if (fileExists(fullPath)) {
      return issues;
    }

    // The expected file does not exist.  Check whether the current document
    // itself provides a global error handler via:
    //   (a) a named <error-handler> element, OR
    //   (b) a flow that references an error handler by ref attribute
    const hasNamedErrorHandler = this.exists('//*[local-name()="error-handler"][@name]', doc);
    if (hasNamedErrorHandler) {
      return issues;
    }

    const hasErrorHandlerRef = this.exists('//*[local-name()="error-handler"][@ref]', doc);
    if (hasErrorHandlerRef) {
      return issues;
    }

    // Only report for files that actually contain flows / sub-flows so that
    // pure configuration files (e.g. global.xml without flows) are excluded.
    const hasFlows = this.exists('//*[local-name()="flow" or local-name()="sub-flow"]', doc);

    if (!hasFlows) {
      return issues;
    }

    issues.push(
      this.createFileIssue(
        `Global error handler configuration not found. Expected "${expectedFile}" or a named <error-handler> element in any flow file.`,
        {
          suggestion:
            'Create a global-error-handler.xml file with a named <error-handler> element, or add an <error-handler name="..."> to an existing configuration file',
        },
      ),
    );

    return issues;
  }
}
