import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import { LintEngine } from '../../engine/LintEngine';
import { getRuleById } from '../../rules';

/**
 * Register the run_lint_analysis tool on the MCP server
 */
export function registerRunLintAnalysis(server: McpServer, engine: LintEngine): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).tool(
    'run_lint_analysis',
    'USE THIS TOOL FIRST to analyze a MuleSoft project. It scans the codebase for best practice violations, security issues (secure:: properties), and potential runtime errors. Returns a comprehensive report needed to identify what needs fixing.',
    {
      projectPath: z.string().describe('Absolute path to the MuleSoft project directory to scan'),
    },
    async ({ projectPath }: { projectPath: string }) => {
      try {
        const report = await engine.scan(projectPath);

        const summary = {
          totalFiles: report.summary.totalFiles,
          totalIssues:
            report.summary.bySeverity.error +
            report.summary.bySeverity.warning +
            report.summary.bySeverity.info,
          errors: report.summary.bySeverity.error,
          warnings: report.summary.bySeverity.warning,
          // Include quality metrics if available
          qualityMetrics: report.metrics
            ? {
                complexity: report.metrics.complexity,
                maintainability: report.metrics.maintainability,
                reliability: report.metrics.reliability,
                security: report.metrics.security,
              }
            : undefined,
          issues: report.files
            .map((r) => ({
              file: r.relativePath,
              issues: r.issues.map((i) => {
                // Get issueType from rule metadata
                const rule = getRuleById(i.ruleId);
                return {
                  ruleId: i.ruleId,
                  message: i.message,
                  line: i.line,
                  column: i.column,
                  severity: i.severity,
                  issueType: rule?.issueType ?? 'code-smell',
                  suggestion: i.suggestion,
                  codeSnippet: i.codeSnippet,
                };
              }),
            }))
            .filter((r) => r.issues.length > 0),
        };

        return {
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
