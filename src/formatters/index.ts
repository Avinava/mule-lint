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
import type { Rule } from '../types';

/**
 * Format a lint report using the specified formatter
 */
export function format(report: LintReport, type: FormatterType, rules: Rule[] = ALL_RULES): string {
  switch (type) {
    case 'table':
      return formatTable(report);
    case 'json':
      return formatJson(report);
    case 'sarif':
      return formatSarif(report, rules);
    case 'html':
      return formatHtml(report, rules);
    case 'csv':
      return formatCsv(report);
    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unknown formatter type: ${String(_exhaustiveCheck)}`);
    }
  }
}
