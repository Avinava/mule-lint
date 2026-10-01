import { LintReport } from '../types/Report';

/**
 * Format lint report as CSV
 */
export function formatCsv(report: LintReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Severity,Rule,File,Line,Column,Message');

  // Files
  for (const file of report.files) {
    if (!file.parsed) {
      lines.push(
        escapeCsvRow([
          'error',
          'PARSE-ERROR',
          file.relativePath,
          '1',
          '1',
          file.parseError ?? 'Failed to parse file',
        ]),
      );
      continue;
    }

    for (const issue of file.issues) {
      lines.push(
        escapeCsvRow([
          issue.severity,
          issue.ruleId,
          file.relativePath,
          issue.line.toString(),
          (issue.column ?? 0).toString(),
          issue.message,
        ]),
      );
    }
  }

  return lines.join('\n');
}

/** Spreadsheet apps evaluate cells that start with these characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvRow(fields: string[]): string {
  return fields
    .map((field) => {
      const safe = FORMULA_PREFIX.test(field) ? `'${field}` : field;
      const escaped = safe.replace(/"/g, '""');
      if (/[",\r\n]/.test(escaped)) {
        return `"${escaped}"`;
      }
      return escaped;
    })
    .join(',');
}
