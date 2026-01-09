#!/usr/bin/env node
import { MuleLintMcpServer } from '../src/mcp';

async function main() {
    const server = new MuleLintMcpServer();
    await server.start();
}

main().catch((error) => {
    console.error('Fatal error in MCP server:', error);
    process.exit(1);
});
