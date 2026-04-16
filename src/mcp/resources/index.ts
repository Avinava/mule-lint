import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getErrorMessage } from '../../core/errors';
import { ALL_RULES } from '../../rules';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Register all MCP resources (rules catalog, docs)
 */
export function registerResources(server: McpServer): void {
  registerRulesResource(server);
  registerDocsResource(server);
}

/**
 * Resource: mule-lint://rules
 * Comprehensive catalog of all available linting rules
 */
function registerRulesResource(server: McpServer): void {
  server.registerResource(
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
}

/**
 * Resource: mule-lint://docs/{slug}
 * Access official MuleSoft development best practices documentation.
 *
 * Each slug maps to a focused, self-contained guide optimized for LLM consumption.
 * Guides are typically < 200 lines and cover a single topic with decision matrices,
 * code examples, anti-patterns, and checklists.
 */
function registerDocsResource(server: McpServer): void {
  server.registerResource(
    'docs',
    new ResourceTemplate('mule-lint://docs/{slug}', {
      list: () => {
        return {
          resources: [
            // ── Core Development ──
            {
              uri: 'mule-lint://docs/error-handling',
              name: 'Error Handling',
              description:
                'Global error handlers, HTTP vs event-driven patterns, connector error types, centralized CRM error log objects, self-healing error flows',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/variables',
              name: 'Variable Contracts',
              description:
                'Standard variable sets for APIKit routes and event listeners, correlation ID sourcing, array mirroring',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/logging',
              name: 'Logging Standards',
              description:
                'Logger categories, structured JSON logging, MDC/tracing module, PII prevention, log levels',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/security',
              name: 'Security',
              description:
                'Secure properties, TLS 1.2+, credential management, zero-trust architecture, input validation',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/performance',
              name: 'Performance',
              description:
                'Timeouts, connection pooling, async error handling, streaming, flow complexity limits, pre-batch bulk lookup (N+1 prevention with scatter-gather + groupBy)',
              mimeType: 'text/markdown',
            },
            // ── Architecture & Patterns ──
            {
              uri: 'mule-lint://docs/event-driven',
              name: 'Event-Driven Patterns',
              description:
                'Platform Events, Anypoint MQ, VM Queue Dispatcher, scheduler watermarking with ObjectStore, deferred task polling, AsyncAPI 2.6, deduplication',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/connectors',
              name: 'Connector Patterns',
              description:
                'Entity config YAML pattern, Salesforce/NetSuite connector gotchas, protocol negotiation, ObjectStore caching, DWL utility modules',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/dataweave',
              name: 'DataWeave Patterns',
              description:
                'DWL modules, type coercion for connectors, cross-system value mapping (4 strategies: DWL, JSON dictionary, bidirectional, external), import path rules',
              mimeType: 'text/markdown',
            },
            // ── Project & Operations ──
            {
              uri: 'mule-lint://docs/folder-structure',
              name: 'Folder Structure',
              description:
                'Standard Maven layout for Mule 4 projects, file naming, directory organization',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/documentation-standards',
              name: 'Documentation Standards',
              description:
                'Flow doc:description, README templates, DataWeave comments, commit message conventions',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/testing',
              name: 'Testing (MUnit)',
              description:
                'MUnit test structure, error scenario testing, event-driven testing, coverage goals',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/ci-cd',
              name: 'CI/CD Integration',
              description:
                'Pipeline stages, mule-lint integration, quality gates, SARIF output, GitHub Actions',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/deployment',
              name: 'Deployment & Modernization (2026)',
              description:
                'CloudHub 2.0, Java 17 migration, Anypoint Code Builder, API Governance, monitoring',
              mimeType: 'text/markdown',
            },
            // ── Reference ──
            {
              uri: 'mule-lint://docs/best-practices',
              name: 'Best Practices Index',
              description:
                'Master index linking to all topic-specific guides with quick reference card and API-Led overview',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/rules-catalog',
              name: 'Rules Catalog',
              description:
                'Complete reference for all 82 lint rules with severity, examples, and configuration options',
              mimeType: 'text/markdown',
            },
            // ── Linter Internals (for contributors) ──
            {
              uri: 'mule-lint://docs/architecture',
              name: 'Linter Architecture',
              description: 'Internal linter design, patterns, and data flow (for contributors)',
              mimeType: 'text/markdown',
            },
            {
              uri: 'mule-lint://docs/extending',
              name: 'Extending the Linter',
              description: 'How to create custom rules and extend mule-lint (for contributors)',
              mimeType: 'text/markdown',
            },
          ],
        };
      },
    }),
    {
      description:
        'Access MuleSoft development best practices and linter documentation. Each slug maps to a focused topic guide. Start by listing available resources, then read the guides relevant to your current task. For example, read "error-handling" when implementing error handlers, or "connectors" when configuring Salesforce/NetSuite connectors.',
      mimeType: 'text/markdown',
    },
    (uri, variables) => {
      const slug = variables.slug as string;

      // Map slugs to file paths — topic-specific best practices + linter docs
      const docsMap: Record<string, string> = {
        // Core Development
        'error-handling': 'docs/best-practices/error-handling.md',
        variables: 'docs/best-practices/variable-contracts.md',
        logging: 'docs/best-practices/logging.md',
        security: 'docs/best-practices/security.md',
        performance: 'docs/best-practices/performance.md',

        // Architecture & Patterns
        'event-driven': 'docs/best-practices/event-driven-patterns.md',
        connectors: 'docs/best-practices/connector-patterns.md',
        dataweave: 'docs/best-practices/dataweave-patterns.md',

        // Project & Operations
        'folder-structure': 'docs/best-practices/folder-structure.md',
        'documentation-standards': 'docs/best-practices/documentation-standards.md',
        testing: 'docs/best-practices/testing.md',
        'ci-cd': 'docs/best-practices/ci-cd.md',
        deployment: 'docs/best-practices/deployment-2026.md',

        // Reference
        'best-practices': 'docs/best-practices/mulesoft-best-practices.md',
        'rules-catalog': 'docs/best-practices/rules-catalog.md',

        // Linter Internals — keep for contributors
        architecture: 'docs/linter/architecture.md',
        extending: 'docs/linter/extending.md',
        naming: 'docs/linter/naming-conventions.md',
      };

      const relativePath = docsMap[slug];
      if (!relativePath) {
        const available = Object.keys(docsMap).join(', ');
        return {
          contents: [
            {
              uri: uri.href,
              text: `Document not found: "${slug}". Available slugs: ${available}`,
              mimeType: 'text/plain',
            },
          ],
        };
      }

      try {
        // Try relative to CWD first (local dev), then relative to package root
        let docPath = path.resolve(process.cwd(), relativePath);
        if (!fs.existsSync(docPath)) {
          docPath = path.resolve(__dirname, '../../../', relativePath);
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
