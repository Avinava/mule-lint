import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface TextToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface TextPromptResult {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
}

type InputSchema<Input extends object> = {
  [Key in keyof Input]-?: z.ZodType<Input[Key]>;
};

interface StableMcpRegistration {
  registerTool<Input extends object>(
    name: string,
    config: { description: string; inputSchema: InputSchema<Input> },
    callback: (input: Input) => TextToolResult | Promise<TextToolResult>,
  ): unknown;
  registerPrompt<Input extends object>(
    name: string,
    config: { description: string; argsSchema: InputSchema<Input> },
    callback: (input: Input) => TextPromptResult,
  ): unknown;
}

/**
 * Isolate the SDK's recursive Zod 3/4 compatibility types. The public SDK
 * generics can otherwise exhaust TypeScript's heap when many tools are
 * registered in one project; this adapter retains checked application I/O.
 */
function stableRegistration(server: McpServer): StableMcpRegistration {
  // Avoid instantiating the SDK's recursive generic signatures during declaration emit.
  return server as unknown as StableMcpRegistration;
}

export function registerTool<Input extends object>(
  server: McpServer,
  name: string,
  config: { description: string; inputSchema: InputSchema<Input> },
  callback: (input: Input) => TextToolResult | Promise<TextToolResult>,
): void {
  stableRegistration(server).registerTool(name, config, callback);
}

export function registerPrompt<Input extends object>(
  server: McpServer,
  name: string,
  config: { description: string; argsSchema: InputSchema<Input> },
  callback: (input: Input) => TextPromptResult,
): void {
  stableRegistration(server).registerPrompt(name, config, callback);
}
