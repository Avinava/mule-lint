export * from './TableFormatter';
export * from './JsonFormatter';
export * from './SarifFormatter';
export * from './HtmlFormatter';
export * from './CsvFormatter';
export * from './MarkdownFormatter';
export * from './GithubFormatter';
export * from './JunitFormatter';

import { LintReport } from '../types/Report';
import { FormatterType } from '../types/Config';
import { ALL_RULES } from '../rules';
import { formatTable } from './TableFormatter';
import { formatJson } from './JsonFormatter';
import { formatSarif } from './SarifFormatter';
import { formatHtml } from './HtmlFormatter';
import { formatCsv } from './CsvFormatter';
import { formatMarkdown } from './MarkdownFormatter';
import { formatGithub } from './GithubFormatter';
import { formatJunit } from './JunitFormatter';
import type { Rule } from '../types';
import { createReportContract } from '../core/ReportContract';

/**
 * Format a lint report using the specified formatter
 */
export function format(report: LintReport, type: FormatterType, rules: Rule[] = ALL_RULES): string {
  switch (type) {
    case 'table':
      return formatTable(report);
    case 'json':
      return formatJson(report);
    case 'report-json':
      return JSON.stringify(createReportContract(report, rules), null, 2);
    case 'sarif':
      return formatSarif(report, rules);
    case 'html':
      return formatHtml(report, rules);
    case 'csv':
      return formatCsv(report);
    case 'markdown':
      return formatMarkdown(report);
    case 'github':
      return formatGithub(report);
    case 'junit':
      return formatJunit(report);
    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unknown formatter type: ${String(_exhaustiveCheck)}`);
    }
  }
}
