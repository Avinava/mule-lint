import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getRuleById } from '../../rules';
import { registerTool } from '../register';

interface GetRuleDetailsInput {
  ruleId: string;
}

/**
 * Mapping from rule category to the best-practice doc slug.
 * Used by get_rule_details to point agents at the relevant guide.
 */
const categoryToDocSlug: Record<string, string> = {
  'error-handling': 'error-handling',
  naming: 'variables',
  security: 'security',
  logging: 'logging',
  http: 'performance',
  performance: 'performance',
  documentation: 'documentation-standards',
  standards: 'best-practices',
  complexity: 'performance',
  structure: 'folder-structure',
  yaml: 'security',
  dataweave: 'dataweave',
  'api-led': 'best-practices',
  connector: 'connectors',
  governance: 'ci-cd',
  operations: 'ci-cd',
  experimental: 'best-practices',
};

/**
 * Register the get_rule_details tool on the MCP server
 */
export function registerGetRuleDetails(server: McpServer): void {
  registerTool<GetRuleDetailsInput>(
    server,
    'get_rule_details',
    {
      description:
        'Retrieve detailed documentation for a specific linting rule ID (e.g., MULE-001). Use this to understand WHY a rule failed and HOW to fix it properly according to best practices. Returns rule metadata, the relevant best-practice guide slug, and related rules.',
      inputSchema: {
        ruleId: z.string().describe('The ID of the rule to retrieve (e.g., "MULE-001", "DW-004")'),
      },
    },
    ({ ruleId }) => {
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

      const docSlug = categoryToDocSlug[rule.category] || 'best-practices';

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
                bestPracticeGuide: {
                  slug: docSlug,
                  uri: `mule-lint://docs/${docSlug}`,
                  hint: `Read the "${docSlug}" resource for detailed patterns, code examples, and checklists related to this rule.`,
                },
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
