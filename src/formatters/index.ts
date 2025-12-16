export * from './TableFormatter';
export * from './JsonFormatter';
export * from './SarifFormatter';
export * from './HtmlFormatter';
export * from './CsvFormatter';

import { LintReport } from '../types/Report';
import { FormatterType } from '../types/Config';
import { ALL_RULES } from '../rules';
import { formatTable } from './TableFormatter';
import { formatJson } from './JsonFormatter';
import { formatSarif } from './SarifFormatter';
import { formatHtml } from './HtmlFormatter';
import { formatCsv } from './CsvFormatter';

/**
 * Format a lint report using the specified formatter
 */
export function format(report: LintReport, type: FormatterType): string {
    switch (type) {
        case 'table':
            return formatTable(report);
        case 'json':
            return formatJson(report);
        case 'sarif':
            return formatSarif(report, ALL_RULES);
        case 'html':
            return formatHtml(report);
        case 'csv':
            return formatCsv(report);
        default: {
            const _exhaustiveCheck: never = type;
            throw new Error(`Unknown formatter type: ${String(_exhaustiveCheck)}`);
        }
    }
}
