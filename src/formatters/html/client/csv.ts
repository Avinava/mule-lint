import type { ClientIssue } from '../reportData';
/** CSV retains formula-injection protection and the existing public column order. */
export function findingsCsv(issues: readonly Partial<ClientIssue>[]): string {
  const fields = [
    'severity',
    'ruleId',
    'fileName',
    'line',
    'column',
    'message',
    'suggestion',
  ] as const;
  const cell = (value: string | number | undefined) => {
    const text = String(value ?? '');
    const safe = /^(?:[\t\r\n]|\s*[=+\-@])/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return [
    'Severity,Rule,File,Line,Column,Message,Suggestion',
    ...issues.map((i) => fields.map((k) => cell(i[k])).join(',')),
  ].join('\r\n');
}
