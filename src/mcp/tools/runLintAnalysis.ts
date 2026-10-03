import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import type { LintEngine } from '../../engine/LintEngine';
import { ALL_RULES } from '../../rules';
import type { RuleProfileName } from '../../catalog';
import { registerTool } from '../register';
import { reportSchema } from '../../core/ReportContract';
import { analyze } from '../../core/AnalysisService';

interface RunLintAnalysisInput {
  projectPath: string;
  profile?: RuleProfileName;
}

/**
 * Register the run_lint_analysis tool on the MCP server
 */
export function registerRunLintAnalysis(server: McpServer, engine: LintEngine): void {
  registerTool<RunLintAnalysisInput>(
    server,
    'run_lint_analysis',
    {
      outputSchema: reportSchema.shape,
      description:
        'USE THIS TOOL FIRST to analyze a MuleSoft project. Checks enabled static-analysis rules for best practice violations, secure:: property references, and potential runtime errors. Inspect structuredContent.execution and scan scope before interpreting findings; this is not a complete security assessment.',
      inputSchema: {
        projectPath: z.string().describe('Absolute path to the MuleSoft project directory to scan'),
        profile: z
          .enum(['baseline', 'recommended', 'strict'])
          .optional()
          .describe('Optional built-in rule profile; defaults to recommended'),
      },
    },
    async ({ projectPath, profile }) => {
      try {
        const { report, contract } = await analyze(
          { targetPath: projectPath, ...(profile ? { profile } : {}) },
          profile ? { rules: ALL_RULES } : { engine },
        );

        const summary = {
          totalFiles: report.summary.totalFiles,
          totalIssues: contract.summary.totalIssues,
          errors: contract.summary.bySeverity.error,
          warnings: contract.summary.bySeverity.warning,
          execution: contract.execution,
          schemaVersion: contract.schemaVersion,
          tool: contract.tool,
          profile: contract.scan.profile,
          // Include quality metrics if available
          qualityMetrics:
            report.metrics && contract.execution.status === 'complete'
              ? {
                  complexity: report.metrics.complexity,
                  maintainability: report.metrics.maintainability,
                  reliability: report.metrics.reliability,
                  security: report.metrics.security,
                }
              : undefined,
          issues: [
            ...new Set(
              contract.findings.map((finding) => finding.location.path ?? 'Project Structure'),
            ),
          ].map((file) => ({
            file,
            issues: contract.findings
              .filter((finding) => (finding.location.path ?? 'Project Structure') === file)
              .map((finding) => ({
                ...finding,
                line: finding.location.line ?? 0,
                column: finding.location.column,
              })),
          })),
        };

        return {
          structuredContent: contract,
          ...(contract.execution.status !== 'complete' ? { isError: true } : {}),
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
          content: [
            {
              type: 'text',
              text: `Analysis failed: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
