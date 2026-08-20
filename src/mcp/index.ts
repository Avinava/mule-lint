import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { LintEngine } from '../engine/LintEngine';
import { LintConfig } from '../types';
import { ALL_RULES } from '../rules';
import packageJson from '../../package.json';

import { registerRunLintAnalysis } from './tools/runLintAnalysis';
import { registerGetRuleDetails } from './tools/getRuleDetails';
import { registerValidateSnippet } from './tools/validateSnippet';
import { registerFormatMuleXml } from './tools/formatMuleXml';
import { registerValidateApiContract } from './tools/validateApiContract';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

/**
 * Mule Lint MCP Server
 * Exposes linting capabilities via Model Context Protocol.
 */
export class MuleLintMcpServer {
  private server: McpServer;
  private engine: LintEngine;

  constructor() {
    this.server = new McpServer({
      name: 'mule-lint',
      version: packageJson.version,
    });

    // Initialize engine with partial config - let LintEngine apply DEFAULT_CONFIG for include/exclude
    const defaultConfig: Partial<LintConfig> = {
      extends: 'mule-lint:recommended',
      rules: {},
      defaultFormatter: 'json',
      failOnWarning: false,
    };
    this.engine = new LintEngine({
      rules: ALL_RULES,
      config: defaultConfig,
    });

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  private setupTools(): void {
    registerRunLintAnalysis(this.server, this.engine);
    registerGetRuleDetails(this.server);
    registerValidateSnippet(this.server, this.engine);
    registerFormatMuleXml(this.server);
    registerValidateApiContract(this.server);
  }

  private setupResources(): void {
    registerResources(this.server);
  }

  private setupPrompts(): void {
    registerPrompts(this.server);
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // eslint-disable-next-line no-console -- stdout is reserved for MCP protocol traffic.
    console.error('Mule Lint MCP Server running on stdio');
  }
}
