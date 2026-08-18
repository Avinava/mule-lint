import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import { LintEngine } from '../../engine/LintEngine';
import { ALL_RULES } from '../../rules';
import { normalizeRuleProfile, toRuleProfileReference, type RuleProfileName } from '../../catalog';
import { registerTool } from '../register';

interface ValidateSnippetInput {
  code: string;
  type: 'xml';
  profile?: RuleProfileName;
}

/**
 * Register the validate_snippet tool on the MCP server
 */
export function registerValidateSnippet(server: McpServer, engine: LintEngine): void {
  registerTool<ValidateSnippetInput>(
    server,
    'validate_snippet',
    {
      description:
        'Validates a small XML code snippet in isolation. Use this to check syntax and basic rules on generated code BEFORE suggesting it to the user.',
      inputSchema: {
        code: z.string().describe('The XML code snippet to validate'),
        type: z.enum(['xml']).describe('The type of code (currently only xml is supported)'),
        profile: z
          .enum(['baseline', 'recommended', 'strict'])
          .optional()
          .describe('Optional built-in rule profile; defaults to recommended'),
      },
    },
    ({ code, profile }) => {
      try {
        const selectedEngine = profile
          ? new LintEngine({
              rules: ALL_RULES,
              config: {
                extends: toRuleProfileReference(normalizeRuleProfile(profile)),
              },
            })
          : engine;
        const issues = selectedEngine.scanContent(code, 'snippet.xml');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issues, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Validation failed: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
