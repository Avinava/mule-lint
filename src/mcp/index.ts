import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { LintEngine } from '../engine/LintEngine';
import { LintConfig, ValidationContext } from '../types';
import { ALL_RULES, getRuleById } from '../rules';
import { parseXml } from '../core/XmlParser';
import * as path from 'path';
import * as fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';

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
            version: '1.8.3',
        });

        // Initialize engine with default config
        const defaultConfig: LintConfig = {
            rules: {},
            include: [],
            exclude: [],
            defaultFormatter: 'json',
            failOnWarning: false,
        };
        // LintEngine takes EngineOptions, not just config
        this.engine = new LintEngine({
            rules: ALL_RULES,
            config: defaultConfig,
        });

        this.setupTools();
        this.setupResources();
    }

    private setupTools() {
        // Tool: run_lint_analysis
        this.server.tool(
            'run_lint_analysis',
            'Runs the scanning engine on a specified directory. Returns a JSON summary of errors, warnings, and code references.',
            {
                projectPath: z
                    .string()
                    .describe('Absolute path to the MuleSoft project directory to scan'),
            },
            async ({ projectPath }) => {
                try {
                    const report = await this.engine.scan(projectPath);

                    const summary = {
                        totalFiles: report.summary.totalFiles,
                        totalIssues:
                            report.summary.bySeverity.error +
                            report.summary.bySeverity.warning +
                            report.summary.bySeverity.info,
                        errors: report.summary.bySeverity.error,
                        warnings: report.summary.bySeverity.warning,
                        issues: report.files
                            .map((r) => ({
                                file: r.relativePath,
                                issues: r.issues.map((i) => ({
                                    ruleId: i.ruleId,
                                    message: i.message,
                                    line: i.line,
                                    column: i.column,
                                    severity: i.severity,
                                    suggestion: i.suggestion,
                                    codeSnippet: i.codeSnippet,
                                })),
                            }))
                            .filter((r) => r.issues.length > 0),
                    };

                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(summary, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Analysis failed: ${errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }
            },
        );

        // Tool: get_rule_details
        this.server.tool(
            'get_rule_details',
            'Returns the full documentation and rationale for a specific rule.',
            {
                ruleId: z
                    .string()
                    .describe('The ID of the rule to retrieve (e.g., "MULE-001", "DW-004")'),
            },
            async ({ ruleId }) => {
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
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            },
        );

        // Tool: validate_snippet
        this.server.tool(
            'validate_snippet',
            'Quickly validates a small chunk of code without a full project structure.',
            {
                code: z.string().describe('The code snippet to validate'),
                type: z.enum(['xml', 'dwl']).describe('The type of code (xml or dwl)'),
            },
            async ({ code, type }) => {
                try {
                    // Create minimal context
                    const context: ValidationContext = {
                        filePath: 'snippet.xml',
                        relativePath: 'snippet.xml',
                        projectRoot: '/tmp',
                        config: { enabled: true, severity: 'info', options: {} },
                    };

                    // Filter relevant rules
                    const applicableRules = ALL_RULES.filter((r) => {
                        if (type === 'dwl') return r.category === 'dataweave';
                        return r.category !== 'dataweave'; // Approximate, XML rules
                    });

                    const issues = [];

                    if (type === 'xml') {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(code, 'text/xml');
                        // Simple check for parse errors
                        const parseErrors = doc.getElementsByTagName('parsererror');
                        if (parseErrors.length > 0) {
                            throw new Error('XML Parse Error');
                        }

                        for (const rule of applicableRules) {
                            if (rule.validate) issues.push(...rule.validate(doc, context));
                        }
                    } else if (type === 'dwl') {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'DWL snippet validation currently requires file context.',
                                },
                            ],
                        };
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
                                text: `Validation failed: ${error}`,
                            },
                        ],
                        isError: true,
                    };
                }
            },
        );
    }

    private setupResources() {
        // Resource: rules
        this.server.registerResource(
            'rules',
            'mule-lint://rules',
            {
                description:
                    'A JSON list of all registered rules, their categories, and severity levels.',
                mimeType: 'application/json',
            },
            async (uri) => {
                const rulesList = ALL_RULES.map((r) => ({
                    id: r.id,
                    name: r.name,
                    category: r.category,
                    severity: r.severity,
                    description: r.description,
                }));

                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: JSON.stringify(rulesList, null, 2),
                            mimeType: 'application/json',
                        },
                    ],
                };
            },
        );

        // Resource: docs
        this.server.registerResource(
            'docs',
            new ResourceTemplate('mule-lint://docs/{slug}', {
                list: async () => {
                    return {
                        resources: [
                            {
                                uri: 'mule-lint://docs/architecture',
                                name: 'Architecture',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/best-practices',
                                name: 'Best Practices',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/documentation-standards',
                                name: 'Documentation Standards',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/extending',
                                name: 'Extending',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/folder-structure',
                                name: 'Folder Structure',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/naming',
                                name: 'Naming Conventions',
                                mimeType: 'text/markdown',
                            },
                            {
                                uri: 'mule-lint://docs/rules-catalog',
                                name: 'Rules Catalog',
                                mimeType: 'text/markdown',
                            },
                        ],
                    };
                },
            }),
            {
                description:
                    'Access internal documentation (e.g., best-practices, architecture, naming).',
                mimeType: 'text/markdown',
            },
            async (uri, variables) => {
                const slug = variables.slug as string;
                const docsMap: Record<string, string> = {
                    architecture: 'docs/linter/architecture.md',
                    'best-practices': 'docs/best-practices/mulesoft-best-practices.md',
                    'documentation-standards': 'docs/best-practices/documentation-standards.md',
                    extending: 'docs/linter/extending.md',
                    'folder-structure': 'docs/best-practices/folder-structure.md',
                    naming: 'docs/linter/naming-conventions.md',
                    'rules-catalog': 'docs/best-practices/rules-catalog.md',
                };

                const relativePath = docsMap[slug];
                if (!relativePath) {
                    return {
                        contents: [
                            {
                                uri: uri.href,
                                text: `Document not found: ${slug}. Available: ${Object.keys(docsMap).join(', ')}`,
                                mimeType: 'text/plain',
                            },
                        ],
                    };
                }

                try {
                    // Start looking from probable project root (cwd where server is started or package root)
                    // Since we are running as a tool, we might be installed in node_modules or run locally.
                    // Best effort: look relative to CWD if running locally, or handle package structure.
                    // For now, assuming standard repo structure or npm package usage where docs are included.
                    // CAUTION: 'docs' folder might not be in 'dist'. We need to ensure docs are shipped or read from repo.

                    // Simple heuristic: try to find docs relative to process.cwd() first (local dev),
                    // then relative to __dirname (installed package).
                    let docPath = path.resolve(process.cwd(), relativePath);
                    if (!fs.existsSync(docPath)) {
                        // Try resolving from package root if we are in dist/bin
                        // __dirname is dist/bin or src/mcp.
                        // Go up 2 levels from dist/bin -> package root
                        docPath = path.resolve(__dirname, '../../', relativePath);
                    }

                    if (fs.existsSync(docPath)) {
                        const content = fs.readFileSync(docPath, 'utf-8');
                        return {
                            contents: [
                                {
                                    uri: uri.href,
                                    text: content,
                                    mimeType: 'text/markdown',
                                },
                            ],
                        };
                    } else {
                        return {
                            contents: [
                                {
                                    uri: uri.href,
                                    text: `Document file not found at: ${docPath}`,
                                    mimeType: 'text/plain',
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        contents: [
                            {
                                uri: uri.href,
                                text: `Error reading document: ${error}`,
                                mimeType: 'text/plain',
                            },
                        ],
                    };
                }
            },
        );
    }

    public async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Mule Lint MCP Server running on stdio');
    }
}
