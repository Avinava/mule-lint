import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all MCP prompts (analyze-project, explain-rule, fix-issue)
 */
export function registerPrompts(server: McpServer): void {
    registerAnalyzeProject(server);
    registerExplainRule(server);
    registerFixIssue(server);
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
            description:
                'Explain a specific linting rule and provide examples of good vs bad code.',
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
