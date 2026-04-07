import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';

/**
 * Register the format_mule_xml tool on the MCP server
 */
export function registerFormatMuleXml(server: McpServer): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
  (server as any).tool(
    'format_mule_xml',
    'Format Mule XML files using Prettier with Anypoint Studio-compatible defaults (4-space indent, 140 width, single-quote safe). Accepts a project path to format all XML files, a single file path, or raw XML content for inline formatting.',
    {
      projectPath: z
        .string()
        .optional()
        .describe(
          'Absolute path to a MuleSoft project directory — formats all XML in src/main/mule/',
        ),
      filePath: z.string().optional().describe('Absolute path to a single Mule XML file to format'),
      content: z
        .string()
        .optional()
        .describe('Raw XML string to format inline (returns formatted text)'),
      check: z
        .boolean()
        .optional()
        .describe('Dry-run mode: report which files need formatting without writing changes'),
      tabWidth: z.number().optional().describe('Spaces per indent level (default: 4)'),
      printWidth: z.number().optional().describe('Max line width before wrapping (default: 140)'),
    },
    async ({
      projectPath,
      filePath: singleFilePath,
      content,
      check,
      tabWidth,
      printWidth,
    }: {
      projectPath?: string;
      filePath?: string;
      content?: string;
      check?: boolean;
      tabWidth?: number;
      printWidth?: number;
    }) => {
      try {
        const { formatXmlContent, formatFile, formatProject } =
          await import('../../formatter/MuleXmlFormatter');

        const options = { check, tabWidth, printWidth };

        // Mode 1: Inline content formatting
        if (content) {
          const result = await formatXmlContent(content, options);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    formatted: result.formatted,
                    changed: result.changed,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Mode 2: Single file
        if (singleFilePath) {
          const result = await formatFile(singleFilePath, options);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // Mode 3: Project
        if (projectPath) {
          const results = await formatProject(projectPath, options);
          const summary = {
            totalFiles: results.length,
            changed: results.filter((r) => r.changed).length,
            errors: results.filter((r) => r.error).length,
            files: results,
          };
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(summary, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Provide one of: projectPath, filePath, or content',
            },
          ],
          isError: true,
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
          content: [
            {
              type: 'text',
              text: `Formatting failed: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
