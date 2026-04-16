import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all MCP prompts (analyze-project, explain-rule, fix-issue, review-best-practices)
 */
export function registerPrompts(server: McpServer): void {
  registerAnalyzeProject(server);
  registerExplainRule(server);
  registerFixIssue(server);
  registerReviewBestPractices(server);
}

/**
 * Prompt: analyze-project
 */
function registerAnalyzeProject(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).registerPrompt(
    'analyze-project',
    {
      description:
        'Analyze the current project for MuleSoft best practice violations and linting issues.',
      argsSchema: {
        path: z.string().describe('The absolute path to the project to analyze'),
      },
    },
    ({ path }: { path: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the MuleSoft project at ${path}. Run the linting engine and summarize the key issues, focusing on severity:error and severity:warning. Group the findings by category (e.g., Security, Naming, Efficiency).`,
            },
          },
        ],
      };
    },
  );
}

/**
 * Prompt: explain-rule
 */
function registerExplainRule(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).registerPrompt(
    'explain-rule',
    {
      description: 'Explain a specific linting rule and provide examples of good vs bad code.',
      argsSchema: {
        ruleId: z.string().describe('The ID of the rule to explain (e.g., MULE-001)'),
      },
    },
    ({ ruleId }: { ruleId: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Can you explain the MuleSoft linting rule ${ruleId}? I need to understand the rationale behind it, potential side effects of ignoring it, and see code examples of both compliant and non-compliant usage.`,
            },
          },
        ],
      };
    },
  );
}

/**
 * Prompt: fix-issue
 */
function registerFixIssue(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).registerPrompt(
    'fix-issue',
    {
      description: 'Suggest a fix for a specific linting issue in a file.',
      argsSchema: {
        issue: z.string().describe('The error message or rule description'),
        file: z.string().describe('The file path where the issue occurred'),
        code: z.string().describe('The specific code snippet causing the issue'),
      },
    },
    ({ issue, file, code }: { issue: string; file: string; code: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I have a linting issue in file ${file}: "${issue}".\nThe problematic code is:\n\`\`\`xml\n${code}\n\`\`\`\nPlease analyze why this is an issue and provide a corrected version of the code that satisfies the rule.`,
            },
          },
        ],
      };
    },
  );
}

/**
 * Prompt: review-best-practices
 *
 * Guides the LLM to read applicable best-practice docs based on project type,
 * then run lint analysis, then cross-reference findings with best practices
 * to provide improvement suggestions beyond just lint rule violations.
 */
function registerReviewBestPractices(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).registerPrompt(
    'review-best-practices',
    {
      description:
        'Review a MuleSoft project against best practices. Reads applicable guides based on project type, runs lint analysis, and provides improvement recommendations beyond rule violations.',
      argsSchema: {
        path: z.string().describe('The absolute path to the MuleSoft project'),
        projectType: z
          .string()
          .describe(
            'The type of project: "http-api" (System/Experience API with HTTP listener), "event-driven" (Process API with platform events/MQ), or "batch" (scheduler/batch processing)',
          ),
      },
    },
    ({ path, projectType }: { path: string; projectType: string }) => {
      // Build the list of recommended docs based on project type
      const commonDocs = ['error-handling', 'logging', 'security', 'variables', 'dataweave'];
      const typeDocs: Record<string, string[]> = {
        'http-api': ['connectors', 'performance', 'folder-structure'],
        'event-driven': ['event-driven', 'connectors'],
        batch: ['performance'],
      };
      const extraDocs = typeDocs[projectType] ?? [];
      const recommendedDocs = [...commonDocs, ...extraDocs];
      const docsList = recommendedDocs.map((d) => `mule-lint://docs/${d}`).join('\n  ');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please perform a comprehensive best practices review of the MuleSoft project at ${path}.

This is a "${projectType}" project. Follow these steps:

1. **Read best practice guides** — read these resources first to understand the standards:
  ${docsList}

2. **Run lint analysis** — use the run_lint_analysis tool on the project path.

3. **Cross-reference** — compare lint findings with the best practices you read. Look for:
   - Lint rule violations and their recommended fixes
   - Patterns that are technically valid but don't follow best practices
   - Missing patterns that should be present (e.g., entity configs, DWL modules, correlation IDs)

4. **Report** — provide a structured summary with:
   - Critical issues (must fix)
   - Recommended improvements (should fix)
   - Architecture observations (consider for future)
   - Specific code examples for each recommendation`,
            },
          },
        ],
      };
    },
  );
}
