import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { LintEngine } from '../engine/LintEngine';
import { LintConfig, ValidationContext } from '../types';
import { ALL_RULES, getRuleById } from '../rules';
import { parseXml } from '../core/XmlParser';
import * as path from 'path';
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
            version: '1.8.0',
        });

        // Initialize engine with default config
        const defaultConfig: LintConfig = {
            rules: {},
            include: [],
            exclude: [],
            defaultFormatter: 'json',
            failOnWarning: false
        };
        // LintEngine takes EngineOptions, not just config
        this.engine = new LintEngine({
            rules: ALL_RULES,
            config: defaultConfig
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
                projectPath: z.string().describe('Absolute path to the MuleSoft project directory to scan')
            },
            async ({ projectPath }) => {
                try {
                    const report = await this.engine.scan(projectPath);

                    const summary = {
                        totalFiles: report.summary.totalFiles,
                        totalIssues: report.summary.bySeverity.error + report.summary.bySeverity.warning + report.summary.bySeverity.info,
                        errors: report.summary.bySeverity.error,
                        warnings: report.summary.bySeverity.warning,
                        issues: report.files.map(r => ({
                            file: r.relativePath,
                            issues: r.issues.map(i => ({
                                ruleId: i.ruleId,
                                message: i.message,
                                line: i.line,
                                column: i.column,
                                severity: i.severity,
                                suggestion: i.suggestion,
                                codeSnippet: i.codeSnippet
                            }))
                        })).filter(r => r.issues.length > 0)
                    };

                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(summary, null, 2)
                            }
                        ]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Analysis failed: ${errorMessage}`
                            }
                        ],
                        isError: true
                    };
                }
            }
        );

        // Tool: get_rule_details
        this.server.tool(
            'get_rule_details',
            'Returns the full documentation and rationale for a specific rule.',
            {
                ruleId: z.string().describe('The ID of the rule to retrieve (e.g., "MULE-001", "DW-004")')
            },
            async ({ ruleId }) => {
                const rule = getRuleById(ruleId);
                if (!rule) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Rule not found: ${ruleId}`
                            }
                        ],
                        isError: true
                    };
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                id: rule.id,
                                name: rule.name,
                                description: rule.description,
                                category: rule.category,
                                severity: rule.severity
                            }, null, 2)
                        }
                    ]
                };
            }
        );

        // Tool: validate_snippet
        this.server.tool(
            'validate_snippet',
            'Quickly validates a small chunk of code without a full project structure.',
            {
                code: z.string().describe('The code snippet to validate'),
                type: z.enum(['xml', 'dwl']).describe('The type of code (xml or dwl)')
            },
            async ({ code, type }) => {
                try {
                    // Create minimal context
                    const context: ValidationContext = {
                        filePath: 'snippet.xml',
                        relativePath: 'snippet.xml',
                        projectRoot: '/tmp',
                        config: { enabled: true, severity: 'info', options: {} }
                    };

                    // Filter relevant rules
                    const applicableRules = ALL_RULES.filter(r => {
                        if (type === 'dwl') return r.category === 'dataweave';
                        return r.category !== 'dataweave'; // Approximate, XML rules
                    });

                    const issues = [];

                    if (type === 'xml') {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(code, 'text/xml');
                        // Simple check for parse errors
                        const parseErrors = doc.getElementsByTagName("parsererror");
                        if (parseErrors.length > 0) {
                            throw new Error('XML Parse Error');
                        }

                        for (const rule of applicableRules) {
                            if (rule.validate) issues.push(...rule.validate(doc, context));
                        }
                    } else if (type === 'dwl') {
                        return {
                            content: [{ type: 'text', text: "DWL snippet validation currently requires file context." }]
                        };
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(issues, null, 2)
                            }
                        ]
                    };

                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Validation failed: ${error}`
                            }
                        ],
                        isError: true
                    };
                }
            }
        );
    }

    private setupResources() {
        // Resource: rules
        this.server.resource(
            'rules',
            'mule-lint://rules',
            async (uri) => {
                const rulesList = ALL_RULES.map(r => ({
                    id: r.id,
                    name: r.name,
                    category: r.category,
                    severity: r.severity,
                    description: r.description
                }));

                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: JSON.stringify(rulesList, null, 2),
                            mimeType: 'application/json'
                        }
                    ]
                };
            }
        );
    }

    public async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Mule Lint MCP Server running on stdio');
    }
}
