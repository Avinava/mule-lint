import * as fs from 'fs';
import * as path from 'path';
import { Issue, ValidationContext } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parseXml } from '../../core/XmlParser';

/**
 * Known external system connector patterns
 * Maps connector namespace prefix to a human-readable system name
 */
const EXTERNAL_SYSTEM_CONNECTORS: Record<string, string> = {
    netsuite: 'NetSuite',
    'netsuite-restlet': 'NetSuite Restlet',
    salesforce: 'Salesforce',
    db: 'Database',
    sap: 'SAP',
    workday: 'Workday',
    servicenow: 'ServiceNow',
    jms: 'JMS',
    amqp: 'AMQP',
    kafka: 'Kafka',
    vm: 'VM Queue',
    sftp: 'SFTP',
    ftp: 'FTP',
    file: 'File System',
    email: 'Email',
    s3: 'Amazon S3',
    sqs: 'Amazon SQS',
    dynamodb: 'Amazon DynamoDB',
    azure: 'Azure',
    mongodb: 'MongoDB',
    redis: 'Redis',
    ldap: 'LDAP',
    soap: 'SOAP',
};

/**
 * Connectors to ignore when counting external systems
 * These are infrastructure/utility connectors, not external business systems
 */
const IGNORED_CONNECTORS = new Set([
    'http', // HTTP listener/request (infrastructure)
    'apikit', // API Kit router
    'secure-properties', // Secure properties
    'os', // Object Store
    'json-logger', // Logging
    'ee', // Enterprise Edition
    'tls', // TLS context
    'oauth', // OAuth
    'validation', // Validation module
    'scripting', // Scripting
    'batch', // Batch processing
    'scheduler', // Scheduler
]);

/**
 * API-004: Single System Per SAPI
 *
 * Enforces the MuleSoft best practice that a System API (SAPI) should
 * integrate with only one backend system. This promotes:
 * - Clear separation of concerns
 * - Easier maintenance and testing
 * - Better reusability across the organization
 * - Simplified error handling and retry logic
 */
export class SingleSystemSapiRule extends ProjectRule {
    id = 'API-004';
    name = 'Single System Per SAPI';
    description = 'System API should integrate with only one backend system';
    severity = 'warning' as const;
    category = 'api-led' as const;

    protected validateProject(context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const projectRoot = context.projectRoot;

        // Check if this looks like a SAPI (System API)
        const projectName = path.basename(projectRoot).toLowerCase();
        const isSapi =
            projectName.includes('-sapi') ||
            projectName.includes('-sys-') ||
            projectName.includes('-system-');

        // Only apply this rule to System APIs
        if (!isSapi) {
            return issues;
        }

        // Find all Mule XML files
        const muleDir = path.join(projectRoot, 'src', 'main', 'mule');
        if (!fs.existsSync(muleDir)) {
            return issues;
        }

        const detectedSystems = new Map<string, string[]>(); // system -> files where found

        // Scan all XML files
        const xmlFiles = this.findXmlFiles(muleDir);
        for (const xmlFile of xmlFiles) {
            try {
                const content = fs.readFileSync(xmlFile, 'utf-8');
                const result = parseXml(content);
                if (!result.success || !result.document) continue;

                // Extract connector namespaces from the root element
                const systems = this.detectExternalSystems(content, result.document);
                for (const system of systems) {
                    const files = detectedSystems.get(system) || [];
                    files.push(path.relative(projectRoot, xmlFile));
                    detectedSystems.set(system, files);
                }
            } catch {
                // Skip files that can't be parsed
            }
        }

        // If more than one external system is detected, create an issue
        if (detectedSystems.size > 1) {
            const systemList = Array.from(detectedSystems.keys()).sort();
            const details = systemList
                .map((sys) => {
                    const files = detectedSystems.get(sys)!;
                    return `${sys} (${files.join(', ')})`;
                })
                .join(', ');

            issues.push(
                this.createProjectIssue(
                    `System API connects to ${detectedSystems.size} backend systems: ${systemList.join(', ')}`,
                    {
                        suggestion: `Following MuleSoft best practices, a System API should integrate with only one backend system. Consider splitting into separate SAPIs: ${details}`,
                        severity: 'warning',
                    },
                ),
            );
        }

        return issues;
    }

    /**
     * Recursively find all XML files in a directory
     */
    private findXmlFiles(dir: string): string[] {
        const files: string[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.findXmlFiles(fullPath));
                } else if (entry.isFile() && entry.name.endsWith('.xml')) {
                    files.push(fullPath);
                }
            }
        } catch {
            // Ignore directories we can't read
        }

        return files;
    }

    /**
     * Detect external systems from XML content and document
     */
    private detectExternalSystems(content: string, _doc: Document): string[] {
        const systems: string[] = [];

        // Extract namespace declarations from the content
        const namespacePattern =
            /xmlns:([a-zA-Z0-9-]+)="[^"]*mulesoft\.org\/schema\/mule\/([^"]+)"/g;
        let match;

        while ((match = namespacePattern.exec(content)) !== null) {
            const prefix = match[1];
            const schemaPath = match[2];

            // Skip ignored connectors
            if (IGNORED_CONNECTORS.has(prefix)) continue;

            // Check if this is a known external system
            if (EXTERNAL_SYSTEM_CONNECTORS[prefix]) {
                // Normalize NetSuite variants
                if (prefix === 'netsuite' || prefix === 'netsuite-restlet') {
                    if (!systems.includes('NetSuite')) {
                        systems.push('NetSuite');
                    }
                } else {
                    const systemName = EXTERNAL_SYSTEM_CONNECTORS[prefix];
                    if (!systems.includes(systemName)) {
                        systems.push(systemName);
                    }
                }
            }
        }

        // Also check for HTTP request configs that might be external systems
        // by looking at the config names (common pattern: *-api, *-service)
        const httpConfigPattern = /http:request-config[^>]*name="([^"]+)"/g;
        while ((match = httpConfigPattern.exec(content)) !== null) {
            const configName = match[1].toLowerCase();
            // Skip internal/listener configs
            if (configName.includes('listener')) continue;

            // Check for known external service patterns
            for (const [key, systemName] of Object.entries(EXTERNAL_SYSTEM_CONNECTORS)) {
                if (configName.includes(key)) {
                    if (!systems.includes(systemName)) {
                        systems.push(systemName);
                    }
                }
            }
        }

        return systems;
    }
}
