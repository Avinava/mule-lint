import type { ApiContractReport } from './types';

export type ApiContractOutputFormat = 'table' | 'json' | 'sarif';

function table(report: ApiContractReport): string {
  const summary = `Contract: ${report.mainFile} (${report.format})\nFunctional: ${report.functionalConforms ? 'conformant' : 'failed'}\nGovernance: ${report.governanceConforms === 'not-run' ? 'not run' : report.governanceConforms ? 'conformant' : 'failed'}`;
  if (report.findings.length === 0) return `${summary}\n\nNo findings.`;
  const rows = report.findings.map(
    (finding) =>
      `${finding.severity.toUpperCase()} ${finding.engine}/${finding.id} ${finding.file}:${finding.line}:${finding.column} ${finding.message}`,
  );
  return `${summary}\n\n${rows.join('\n')}`;
}

function sarif(report: ApiContractReport): string {
  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: '@sfdxy/mule-lint-api-contract', rules: [] } },
          invocations: [{ executionSuccessful: true }],
          results: report.findings.map((finding) => ({
            ruleId: finding.id,
            level: finding.severity === 'info' ? 'note' : finding.severity,
            message: { text: finding.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: finding.file, uriBaseId: '%SRCROOT%' },
                  region: { startLine: finding.line, startColumn: finding.column },
                },
              },
            ],
            properties: { engine: finding.engine },
          })),
        },
      ],
    },
    null,
    2,
  );
}

export function formatApiContractReport(
  report: ApiContractReport,
  format: ApiContractOutputFormat,
): string {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'sarif') return sarif(report);
  return table(report);
}
