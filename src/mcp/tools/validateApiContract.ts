import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateApiContract } from '../../api-contract';
import { getErrorMessage } from '../../core/errors';
import { registerTool } from '../register';

interface ValidateApiContractInput {
  projectPath: string;
  mainFile?: string;
  rulesetPaths?: string[];
  dependencyRoots?: string[];
}

export function registerValidateApiContract(server: McpServer): void {
  registerTool<ValidateApiContractInput>(
    server,
    'validate_api_contract',
    {
      description:
        'Validate a local RAML or OpenAPI contract with AMF and optional local governance rulesets. Remote references are never fetched.',
      inputSchema: {
        projectPath: z.string().describe('Absolute API project directory'),
        mainFile: z.string().optional().describe('Main contract path relative to projectPath'),
        rulesetPaths: z.array(z.string()).optional().describe('Local AMF Validation Profile files'),
        dependencyRoots: z
          .array(z.string())
          .optional()
          .describe('Additional local roots allowed for contract dependencies'),
      },
    },
    async (input) => {
      try {
        const report = await validateApiContract(input);
        return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
      } catch (error) {
        return {
          content: [
            { type: 'text', text: `API contract validation failed: ${getErrorMessage(error)}` },
          ],
          isError: true,
        };
      }
    },
  );
}
