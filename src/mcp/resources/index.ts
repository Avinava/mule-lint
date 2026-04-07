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
 * Access official MuleSoft development best practices documentation
 */
function registerDocsResource(server: McpServer): void {
  server.registerResource(
    'docs',
    new ResourceTemplate('mule-lint://docs/{slug}', {
       
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
            { uri: 'mule-lint://docs/extending', name: 'Extending', mimeType: 'text/markdown' },
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
