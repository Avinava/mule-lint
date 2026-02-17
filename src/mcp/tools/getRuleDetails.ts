import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getRuleById } from '../../rules';

/**
 * Register the get_rule_details tool on the MCP server
 */
export function registerGetRuleDetails(server: McpServer): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
    (server as any).tool(
        'get_rule_details',
        'Retrieve detailed documentation for a specific linting rule ID (e.g., MULE-001). Use this to understand WHY a rule failed and HOW to fix it properly according to best practices.',
        {
            ruleId: z
                .string()
                .describe('The ID of the rule to retrieve (e.g., "MULE-001", "DW-004")'),
        },
        ({ ruleId }: { ruleId: string }) => {
            const rule = getRuleById(ruleId);
            if (!rule) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Rule not found: ${ruleId}`,
                        },
                    ],
                    isError: true,
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                id: rule.id,
                                name: rule.name,
                                description: rule.description,
                                category: rule.category,
                                severity: rule.severity,
                                issueType: rule.issueType ?? 'code-smell',
                                docsUrl: rule.docsUrl,
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        },
    );
}
