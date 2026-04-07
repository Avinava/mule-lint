import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import { ValidationContext } from '../../types';
import { ALL_RULES } from '../../rules';
import { parseXml } from '../../core/XmlParser';

/**
 * Register the validate_snippet tool on the MCP server
 */
export function registerValidateSnippet(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).tool(
    'validate_snippet',
    'Validates a small XML code snippet in isolation. Use this to check syntax and basic rules on generated code BEFORE suggesting it to the user.',
    {
      code: z.string().describe('The XML code snippet to validate'),
      type: z.enum(['xml']).describe('The type of code (currently only xml is supported)'),
    },
    ({ code }: { code: string; type: 'xml' }) => {
      try {
        // Create minimal context
        const context: ValidationContext = {
          filePath: 'snippet.xml',
          relativePath: 'snippet.xml',
          projectRoot: '/tmp',
          config: { enabled: true, severity: 'info', options: {} },
        };

        // Filter to XML-applicable rules
        const applicableRules = ALL_RULES.filter((r) => r.category !== 'dataweave');

        const issues = [];

        const result = parseXml(code, 'snippet.xml');
        if (!result.success || !result.document) {
          throw new Error(result.error ?? 'XML Parse Error');
        }

        for (const rule of applicableRules) {
          if (rule.validate) {
            issues.push(...rule.validate(result.document, context));
          }
        }

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
