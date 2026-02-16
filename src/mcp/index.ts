import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getErrorMessage } from '../core/errors';
import { LintEngine } from '../engine/LintEngine';
import { LintConfig, ValidationContext } from '../types';
import { ALL_RULES, getRuleById } from '../rules';
import * as path from 'path';
import * as fs from 'fs';
import { parseXml } from '../core/XmlParser';

/**
 * Mule Lint MCP Server
 * Exposes linting capabilities via Model Context Protocol.
 */
export class MuleLintMcpServer {
    private server: McpServer;
    private engine: LintEngine;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const packageJson = require('../../package.json') as { version: string };
        this.server = new McpServer({
            name: 'mule-lint',
            version: packageJson.version,
        });

        // Initialize engine with partial config - let LintEngine apply DEFAULT_CONFIG for include/exclude
        const defaultConfig: Partial<LintConfig> = {
            rules: {},
            // Do NOT set include/exclude to empty arrays - that overrides the defaults
            // LintEngine will use DEFAULT_CONFIG: include: ['src/main/mule/**/*.xml']
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
        this.setupPrompts();
    }

    private setupTools(): void {
        // Tool: run_lint_analysis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).tool(
            'run_lint_analysis',
            'USE THIS TOOL FIRST to analyze a MuleSoft project. It scans the codebase for best practice violations, security issues (secure:: properties), and potential runtime errors. Returns a comprehensive report needed to identify what needs fixing.',
            {
                projectPath: z
                    .string()
                    .describe('Absolute path to the MuleSoft project directory to scan'),
            },
            async ({ projectPath }: { projectPath: string }) => {
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
                        // Include quality metrics if available
                        qualityMetrics: report.metrics ? {
                            complexity: report.metrics.complexity,
                            maintainability: report.metrics.maintainability,
                            reliability: report.metrics.reliability,
                            security: report.metrics.security,
                        } : undefined,
                        issues: report.files
                            .map((r) => ({
                                file: r.relativePath,
                                issues: r.issues.map((i) => {
                                    // Get issueType from rule metadata
                                    const rule = getRuleById(i.ruleId);
                                    return {
                                        ruleId: i.ruleId,
                                        message: i.message,
                                        line: i.line,
                                        column: i.column,
                                        severity: i.severity,
                                        issueType: rule?.issueType ?? 'code-smell',
                                        suggestion: i.suggestion,
                                        codeSnippet: i.codeSnippet,
                                    };
                                }),
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
                    const errorMessage = getErrorMessage(error);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).tool(
            'get_rule_details',
            'Retrieve detailed documentation for a specific linting rule ID (e.g., MULE-001). Use this to understand WHY a rule failed and HOW to fix it properly according to best practices.',
            {
                ruleId: z
                    .string()
                    .describe('The ID of the rule to retrieve (e.g., "MULE-001", "DW-004")'),
            },
            ({ ruleId }: { ruleId: string }) => {
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
                                    issueType: rule.issueType ?? 'code-smell',
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).tool(
            'validate_snippet',
            'Validates a small XML or DataWeave code snippet in isolation. Use this to check syntax and basic rules on generated code BEFORE suggesting it to the user.',
            {
                code: z.string().describe('The code snippet to validate'),
                type: z.enum(['xml', 'dwl']).describe('The type of code (xml or dwl)'),
            },
            ({ code, type }: { code: string; type: 'xml' | 'dwl' }) => {
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
                        if (type === 'dwl') { return r.category === 'dataweave'; }
                        return r.category !== 'dataweave'; // Approximate, XML rules
                    });

                    const issues = [];

                    if (type === 'xml') {
                        const result = parseXml(code, 'snippet.xml');
                        if (!result.success || !result.document) {
                            throw new Error(result.error ?? 'XML Parse Error');
                        }

                        for (const rule of applicableRules) {
                            if (rule.validate) { issues.push(...rule.validate(result.document, context)); }
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
                                text: `Validation failed: ${getErrorMessage(error)}`,
                            },
                        ],
                        isError: true,
                    };
                }
            },
        );

        // Tool: format_mule_xml
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).tool(
            'format_mule_xml',
            'Format Mule XML files using Prettier with Anypoint Studio-compatible defaults (4-space indent, 140 width, single-quote safe). Accepts a project path to format all XML files, a single file path, or raw XML content for inline formatting.',
            {
                projectPath: z
                    .string()
                    .optional()
                    .describe('Absolute path to a MuleSoft project directory — formats all XML in src/main/mule/'),
                filePath: z
                    .string()
                    .optional()
                    .describe('Absolute path to a single Mule XML file to format'),
                content: z
                    .string()
                    .optional()
                    .describe('Raw XML string to format inline (returns formatted text)'),
                check: z
                    .boolean()
                    .optional()
                    .describe('Dry-run mode: report which files need formatting without writing changes'),
                tabWidth: z
                    .number()
                    .optional()
                    .describe('Spaces per indent level (default: 4)'),
                printWidth: z
                    .number()
                    .optional()
                    .describe('Max line width before wrapping (default: 140)'),
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
                    const {
                        formatXmlContent,
                        formatFile,
                        formatProject,
                    } = await import('../formatter/MuleXmlFormatter');

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

    private setupResources(): void {
        // Resource: rules
        this.server.registerResource(
            'rules',
            'mule-lint://rules',
            {
                description:
                    'A comprehensive catalog of all available linting rules. Read this to discover what rules are enforceable, their severity levels, and categories (e.g., Security, Performance, DataWeave).',
                mimeType: 'application/json',
            },
            (uri) => {
                const rulesList = ALL_RULES.map((r) => ({
                    id: r.id,
                    name: r.name,
                    category: r.category,
                    severity: r.severity,
                    issueType: r.issueType ?? 'code-smell',
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
                // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
                list: () => {
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
                    'Access the official MuleSoft development best practices and internal documentation. Read these documents to ensure your generated code aligns with our architectural standards, naming conventions, and project structure.',
                mimeType: 'text/markdown',
            },
            (uri, variables) => {
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
                                text: `Error reading document: ${getErrorMessage(error)}`,
                                mimeType: 'text/plain',
                            },
                        ],
                    };
                }
            },
        );
    }

    private setupPrompts(): void {
        // Prompt: analyze-project
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).registerPrompt(
            'analyze-project',
            {
                description:
                    'Analyze the current project for MuleSoft best practice violations and linting issues.',
                argsSchema: {
                    path: z.string().describe('The absolute path to the project to analyze'),
                },
            },
            ({ path }: { path: string }) => {
                return {
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: `Please analyze the MuleSoft project at ${path}. Run the linting engine and summarize the key issues, focusing on severity:error and severity:warning. Group the findings by category (e.g., Security, Naming, Efficiency).`,
                            },
                        },
                    ],
                };
            },
        );

        // Prompt: explain-rule
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).registerPrompt(
            'explain-rule',
            {
                description:
                    'Explain a specific linting rule and provide examples of good vs bad code.',
                argsSchema: {
                    ruleId: z.string().describe('The ID of the rule to explain (e.g., MULE-001)'),
                },
            },
            ({ ruleId }: { ruleId: string }) => {
                return {
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: `Can you explain the MuleSoft linting rule ${ruleId}? I need to understand the rationale behind it, potential side effects of ignoring it, and see code examples of both compliant and non-compliant usage.`,
                            },
                        },
                    ],
                };
            },
        );

        // Prompt: fix-issue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK generic type inference exceeds TS depth limits (TS2589)
        (this.server as any).registerPrompt(
            'fix-issue',
            {
                description: 'Suggest a fix for a specific linting issue in a file.',
                argsSchema: {
                    issue: z.string().describe('The error message or rule description'),
                    file: z.string().describe('The file path where the issue occurred'),
                    code: z.string().describe('The specific code snippet causing the issue'),
                },
            },
            ({ issue, file, code }: { issue: string; file: string; code: string }) => {
                return {
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: `I have a linting issue in file ${file}: "${issue}".\nThe problematic code is:\n\`\`\`xml\n${code}\n\`\`\`\nPlease analyze why this is an issue and provide a corrected version of the code that satisfies the rule.`,
                            },
                        },
                    ],
                };
            },
        );
    }

    public async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Mule Lint MCP Server running on stdio');
    }
}
