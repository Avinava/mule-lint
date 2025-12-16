import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-303: Logger in Until-Successful
 * 
 * Avoid loggers inside until-successful scope (floods logs on retries).
 */
export class LoggerInUntilSuccessfulRule extends BaseRule {
    id = 'MULE-303';
    name = 'Logger in Until-Successful';
    description = 'Avoid loggers inside until-successful scope';
    severity = 'warning' as const;
    category = 'logging' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const loggersInUntilSuccessful = this.select(
            '//mule:until-successful//mule:logger',
            doc
        );

        for (const logger of loggersInUntilSuccessful) {
            const docName = this.getDocName(logger) ?? 'Logger';
            issues.push(this.createIssue(
                logger,
                `Logger "${docName}" inside until-successful may flood logs on retries`,
                {
                    suggestion: 'Move logger outside until-successful or use conditional logging'
                }
            ));
        }

        return issues;
    }
}
