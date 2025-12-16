import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-006: Logger Category Required
 * 
 * All loggers must have a category attribute for proper log filtering.
 * Without categories, logs are harder to filter and analyze.
 */
export class LoggerCategoryRule extends BaseRule {
    id = 'MULE-006';
    name = 'Logger Category Required';
    description = 'All loggers should have a category attribute for proper log filtering';
    severity = 'warning' as const;
    category = 'logging' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get optional required prefix
        const requiredPrefix = this.getOption<string | null>(context, 'requiredPrefix', null);

        // Find loggers without category
        const loggersWithoutCategory = this.select('//mule:logger[not(@category)]', doc);

        for (const logger of loggersWithoutCategory) {
            const docName = this.getDocName(logger) ?? 'Logger';
            const suggestedCategory = this.suggestCategory(context.relativePath);

            issues.push(this.createIssue(
                logger,
                `Logger "${docName}" is missing 'category' attribute`,
                {
                    suggestion: `Add category="${suggestedCategory}"`
                }
            ));
        }

        // If required prefix is set, verify all loggers use it
        if (requiredPrefix) {
            const loggersWithCategory = this.select('//mule:logger[@category]', doc);

            for (const logger of loggersWithCategory) {
                const category = this.getAttribute(logger, 'category');
                if (category && !category.startsWith(requiredPrefix)) {
                    const docName = this.getDocName(logger) ?? 'Logger';

                    issues.push(this.createIssue(
                        logger,
                        `Logger "${docName}" category "${category}" should start with "${requiredPrefix}"`,
                        {
                            suggestion: `Update category to "${requiredPrefix}.${category}"`,
                            severity: 'info'
                        }
                    ));
                }
            }
        }

        return issues;
    }

    /**
     * Suggest a category based on file path
     */
    private suggestCategory(relativePath: string): string {
        // Convert file path to a category
        // e.g., src/main/mule/impl/orders-impl.xml -> com.myorg.impl.orders
        const baseName = relativePath
            .replace(/^src\/main\/mule\//, '')
            .replace(/\.xml$/, '')
            .replace(/[/\\]/g, '.')
            .replace(/-/g, '.');

        return `com.myorg.${baseName}`;
    }
}
