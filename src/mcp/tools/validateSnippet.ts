import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import { LintEngine } from '../../engine/LintEngine';
import { registerTool } from '../register';

interface ValidateSnippetInput {
  code: string;
  type: 'xml';
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
      },
    },
    ({ code }) => {
      try {
        const issues = engine.scanContent(code, 'snippet.xml');

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
