import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * RES-001: Reconnection Strategy
 *
 * Connectors should have reconnection strategies configured for resilience.
 */
export class ReconnectionStrategyRule extends BaseRule {
    id = 'RES-001';
    name = 'Reconnection Strategy';
    description = 'Connectors should have reconnection strategies configured';
    severity = 'warning' as const;
    category = 'performance' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Specific connector configurations that benefit from reconnection strategies
        // Using more specific patterns to avoid false positives on generic "config" elements
        const connectorConfigs = [
            { pattern: 'request-config', name: 'HTTP Request' },
            { pattern: 'listener-config', name: 'HTTP Listener' },
            { pattern: 'jms-config', name: 'JMS' },
            { pattern: 'amqp-config', name: 'AMQP' },
            { pattern: 'sftp-config', name: 'SFTP' },
            { pattern: 'ftp-config', name: 'FTP' },
            { pattern: 'vm-config', name: 'VM' },
        ];

        for (const connector of connectorConfigs) {
            const configs = this.select(`//*[local-name()="${connector.pattern}"]`, doc);

            for (const config of configs) {
                // Check for reconnection or reconnect child elements
                const hasReconnection =
                    this.exists('.//*[local-name()="reconnection"]', config) ||
                    this.exists('.//*[local-name()="reconnect"]', config) ||
                    this.exists('.//*[local-name()="reconnect-forever"]', config);

                if (!hasReconnection) {
                    const name = this.getNameAttribute(config) ?? connector.name;
                    issues.push(
                        this.createIssue(
                            config,
                            `${connector.name} config "${name}" has no reconnection strategy`,
                            {
                                suggestion:
                                    'Add <reconnection> or <reconnect-forever> for resilience',
                            },
                        ),
                    );
                }
            }
        }

        // Database configs specifically - check for db namespace
        const dbConfigs = this.select(
            '//*[local-name()="config" and starts-with(name(), "db:")]',
            doc,
        );
        for (const config of dbConfigs) {
            const hasReconnection =
                this.exists('.//*[local-name()="reconnection"]', config) ||
                this.exists('.//*[local-name()="reconnect"]', config);

            if (!hasReconnection) {
                const name = this.getNameAttribute(config) ?? 'Database';
                issues.push(
                    this.createIssue(
                        config,
                        `Database config "${name}" has no reconnection strategy`,
                        {
                            suggestion: 'Add <reconnection> inside the connection element',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}

/**
 * OPS-001: Auto-Discovery Configuration
 *
 * APIs should have auto-discovery configured for API Manager integration.
 */
export class AutoDiscoveryRule extends BaseRule {
    id = 'OPS-001';
    name = 'Auto-Discovery Configuration';
    description = 'APIs should have auto-discovery configured for API Manager';
    severity = 'info' as const;
    category = 'standards' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check if this is an API (has APIKit router or HTTP listener)
        const hasApiKitRouter = this.exists('//*[local-name()="router"]', doc);
        const hasHttpListener = this.exists('//*[local-name()="listener"]', doc);

        if (!hasApiKitRouter && !hasHttpListener) {
            return issues; // Not an API, skip
        }

        // Check for auto-discovery configuration
        const hasAutoDiscovery = this.exists('//*[local-name()="api-autodiscovery"]', doc);

        if (!hasAutoDiscovery && hasApiKitRouter) {
            issues.push(
                this.createFileIssue('API has no auto-discovery configuration for API Manager', {
                    suggestion: 'Add <api-gateway:autodiscovery> for API Manager integration',
                }),
            );
        }

        // If auto-discovery exists, check it uses placeholders
        if (hasAutoDiscovery) {
            const autodiscoveryNodes = this.select('//*[local-name()="api-autodiscovery"]', doc);
            for (const node of autodiscoveryNodes) {
                const apiId = this.getAttribute(node, 'apiId');
                if (apiId && !apiId.includes('${')) {
                    issues.push(
                        this.createIssue(
                            node,
                            'Auto-discovery apiId should use a property placeholder',
                            {
                                suggestion: 'Use apiId="${api.id}" instead of hardcoded value',
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}

/**
 * OPS-002: HTTP Port Placeholder
 *
 * HTTP listener ports should use property placeholders, not hardcoded values.
 */
export class HttpPortPlaceholderRule extends BaseRule {
    id = 'OPS-002';
    name = 'HTTP Port Placeholder';
    description = 'HTTP listener ports should use property placeholders';
    severity = 'warning' as const;
    category = 'standards' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check HTTP listener configurations
        const listenerConfigs = this.select('//*[local-name()="listener-config"]', doc);

        for (const config of listenerConfigs) {
            const port = this.getAttribute(config, 'port');

            if (port && /^\d+$/.test(port)) {
                // Port is a hardcoded number
                const name = this.getNameAttribute(config) ?? 'HTTP Listener Config';
                issues.push(
                    this.createIssue(config, `HTTP config "${name}" has hardcoded port "${port}"`, {
                        suggestion: 'Use port="${http.port}" or similar placeholder',
                    }),
                );
            }
        }

        return issues;
    }
}

/**
 * SEC-006: Encryption Key in Logs
 *
 * Encryption keys and sensitive credentials should not appear in log statements.
 */
export class EncryptionKeyInLogsRule extends BaseRule {
    id = 'SEC-006';
    name = 'Encryption Key in Logs';
    description = 'Encryption keys and sensitive data should not appear in logs';
    severity = 'error' as const;
    category = 'security' as const;

    private sensitivePatterns = [
        /encrypt.*key/i,
        /decryption.*key/i,
        /secret.*key/i,
        /api[_-]?key/i,
        /password/i,
        /credentials?/i,
        /mule\.key/i,
        /secure::.*key/i,
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find all loggers
        const loggers = this.select('//*[local-name()="logger"]', doc);

        for (const logger of loggers) {
            const message = this.getAttribute(logger, 'message') ?? '';

            // Check for sensitive patterns in log messages
            for (const pattern of this.sensitivePatterns) {
                if (pattern.test(message)) {
                    issues.push(
                        this.createIssue(
                            logger,
                            `Logger may expose sensitive data: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
                            {
                                suggestion:
                                    'Remove encryption keys and sensitive data from log messages',
                            },
                        ),
                    );
                    break; // Only one issue per logger
                }
            }
        }

        return issues;
    }
}

/**
 * HYG-001: Excessive Loggers
 *
 * Flows should not have too many loggers which can impact performance.
 */
export class ExcessiveLoggersRule extends BaseRule {
    id = 'HYG-001';
    name = 'Excessive Loggers';
    description = 'Flows should not have excessive loggers';
    severity = 'warning' as const;
    category = 'logging' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        const maxLoggers = this.getOption<number>(context, 'maxLoggers', 5);

        // Check flows
        const flows = this.select('//*[local-name()="flow"]', doc);

        for (const flow of flows) {
            const flowName = this.getNameAttribute(flow) ?? 'unknown';
            const loggerCount = this.count('.//*[local-name()="logger"]', flow);

            if (loggerCount > maxLoggers) {
                issues.push(
                    this.createIssue(
                        flow,
                        `Flow "${flowName}" has ${loggerCount} loggers (max recommended: ${maxLoggers})`,
                        {
                            suggestion:
                                'Consider reducing loggers or moving detailed logging to DEBUG level',
                        },
                    ),
                );
            }
        }

        // Check sub-flows
        const subflows = this.select('//*[local-name()="sub-flow"]', doc);

        for (const subflow of subflows) {
            const subflowName = this.getNameAttribute(subflow) ?? 'unknown';
            const loggerCount = this.count('.//*[local-name()="logger"]', subflow);

            if (loggerCount > maxLoggers) {
                issues.push(
                    this.createIssue(
                        subflow,
                        `Sub-flow "${subflowName}" has ${loggerCount} loggers (max recommended: ${maxLoggers})`,
                        {
                            suggestion:
                                'Consider reducing loggers or moving detailed logging to DEBUG level',
                        },
                    ),
                );
            }
        }

        return issues;
    }
}

/**
 * HYG-002: Commented Code Detection
 *
 * Detects potentially commented-out code blocks in Mule configurations.
 */
export class CommentedCodeRule extends BaseRule {
    id = 'HYG-002';
    name = 'Commented Code Detection';
    description = 'Detects potentially commented-out code in configurations';
    severity = 'info' as const;
    category = 'standards' as const;

    // Patterns that suggest commented-out XML code
    private codePatterns = [
        /<flow\s/,
        /<sub-flow\s/,
        /<http:/,
        /<logger\s/,
        /<set-variable\s/,
        /<set-payload\s/,
        /<choice>/,
        /<transform\s/,
        /<flow-ref\s/,
        /<try>/,
        /<db:/,
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Use XPath to find comment nodes: comment()
        // Note: In xmldom, we need to iterate through the document differently
        try {
            const commentNodes = this.select('//comment()', doc);

            for (const commentNode of commentNodes) {
                const commentText = commentNode.textContent ?? '';

                // Check if comment contains code-like patterns
                for (const pattern of this.codePatterns) {
                    if (pattern.test(commentText)) {
                        issues.push(
                            this.createIssue(commentNode, 'Commented-out code detected', {
                                suggestion:
                                    'Remove commented code or convert to documentation comment',
                                codeSnippet: commentText.substring(0, 80) + '...',
                            }),
                        );
                        break;
                    }
                }
            }
        } catch {
            // XPath comment() may not be supported in all parsers
            // Silently return empty issues
        }

        return issues;
    }
}

/**
 * OPS-003: Cron Expression Externalized
 *
 * Cron expressions in schedulers should use property placeholders.
 */
export class CronExternalizedRule extends BaseRule {
    id = 'OPS-003';
    name = 'Externalized Cron Expression';
    description = 'Cron expressions should use property placeholders';
    severity = 'warning' as const;
    category = 'standards' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find scheduler cron expressions
        const cronNodes = this.select('//*[local-name()="cron"]', doc);

        for (const node of cronNodes) {
            const expression = this.getAttribute(node, 'expression');

            if (expression && !expression.includes('${')) {
                issues.push(
                    this.createIssue(node, `Hardcoded cron expression: "${expression}"`, {
                        suggestion:
                            'Use expression="${scheduler.cron}" to allow environment-specific scheduling',
                    }),
                );
            }
        }

        return issues;
    }
}

/**
 * API-005: APIKit Validation
 *
 * APIs should use APIKit for auto-generated implementation interfaces.
 */
export class ApiKitValidationRule extends BaseRule {
    id = 'API-005';
    name = 'APIKit Validation';
    description = 'APIs should use APIKit for implementation interfaces';
    severity = 'info' as const;
    category = 'standards' as const;

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check if this appears to be an API project (has HTTP listener)
        const hasHttpListener = this.exists('//*[local-name()="listener"]', doc);
        if (!hasHttpListener) {
            return issues;
        }

        // Check for APIKit router
        const hasApiKitRouter = this.exists('//*[local-name()="router"]', doc);
        const hasApiKitConfig = this.exists(
            '//*[local-name()="config" and contains(@name, "api")]',
            doc,
        );

        if (!hasApiKitRouter && !hasApiKitConfig) {
            // Only flag if this looks like an interface file
            const hasMainFlow = this.exists(
                '//*[local-name()="flow" and (contains(@name, "-main") or contains(@name, "-api"))]',
                doc,
            );
            if (hasMainFlow) {
                issues.push(
                    this.createFileIssue(
                        'Consider using APIKit to auto-generate the implementation interface',
                        {
                            suggestion: 'APIKit provides consistent API implementation patterns',
                        },
                    ),
                );
            }
        }

        // Check for APIKit console disabled in non-dev environments
        const apiKitConfigs = this.select('//*[local-name()="config" and @name]', doc);
        for (const config of apiKitConfigs) {
            const name = this.getNameAttribute(config) ?? '';
            if (name.toLowerCase().includes('api')) {
                const consoleDisabled = this.getAttribute(config, 'disableValidations');
                // Note: This is informational - teams may want console enabled in dev
            }
        }

        return issues;
    }
}

/**
 * HYG-003: Unused Flow Detection
 *
 * Detects flows that are never referenced by flow-ref.
 */
export class UnusedFlowRule extends BaseRule {
    id = 'HYG-003';
    name = 'Unused Flow Detection';
    description = 'Detects flows that are never referenced';
    severity = 'warning' as const;
    category = 'standards' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get all flow names in this document
        const flows = this.select('//*[local-name()="flow"]', doc);
        const subflows = this.select('//*[local-name()="sub-flow"]', doc);

        // Get all flow-ref targets
        const flowRefs = this.select('//*[local-name()="flow-ref"]', doc);
        const referencedFlows = new Set<string>();

        for (const ref of flowRefs) {
            const name = this.getNameAttribute(ref);
            if (name) {
                referencedFlows.add(name);
            }
        }

        // Check sub-flows (they should always be referenced)
        for (const subflow of subflows) {
            const name = this.getNameAttribute(subflow);
            if (name && !referencedFlows.has(name)) {
                // Exclude common patterns that are referenced externally
                if (!this.isExternallyReferenced(name)) {
                    issues.push(
                        this.createIssue(
                            subflow,
                            `Sub-flow "${name}" is never referenced within this file`,
                            {
                                severity: 'info',
                                suggestion:
                                    'Consider removing unused sub-flows or verify cross-file references',
                            },
                        ),
                    );
                }
            }
        }

        // Check private flows (not triggered by HTTP/scheduler)
        for (const flow of flows) {
            const name = this.getNameAttribute(flow);
            if (!name) continue;

            // Skip if it has an external trigger
            const hasHttpListener = this.exists('.//*[local-name()="listener"]', flow);
            const hasScheduler = this.exists('.//*[local-name()="scheduler"]', flow);
            const hasVmListener = this.exists(
                './/*[local-name()="listener" and contains(@config-ref, "vm")]',
                flow,
            );

            if (hasHttpListener || hasScheduler || hasVmListener) {
                continue; // Entry point flow
            }

            // Check if referenced
            if (!referencedFlows.has(name) && !this.isExternallyReferenced(name)) {
                issues.push(
                    this.createIssue(
                        flow,
                        `Flow "${name}" has no trigger and is never referenced`,
                        {
                            severity: 'info',
                            suggestion:
                                'Verify this flow is referenced from other files or remove if unused',
                        },
                    ),
                );
            }
        }

        return issues;
    }

    private isExternallyReferenced(name: string): boolean {
        // Common patterns that are typically referenced externally
        const externalPatterns = [
            /-main$/,
            /-api$/,
            /^api-/,
            /-console$/,
            /-error-handler$/,
            /global/i,
        ];
        return externalPatterns.some((pattern) => pattern.test(name));
    }
}

/**
 * DOC-001: Display Name Enforcement
 *
 * Key components should have meaningful doc:name attributes, not defaults.
 */
export class DisplayNameRule extends BaseRule {
    id = 'DOC-001';
    name = 'Display Name Enforcement';
    description = 'Key components should have meaningful display names';
    severity = 'info' as const;
    category = 'documentation' as const;

    // Components that should have meaningful names, with their default names to flag
    private componentDefaults = [
        { element: 'set-payload', defaults: ['Set Payload', 'set-payload'] },
        { element: 'set-variable', defaults: ['Set Variable', 'set-variable'] },
        { element: 'transform', defaults: ['Transform Message', 'transform'] },
        { element: 'flow-ref', defaults: ['Flow Reference', 'flow-ref'] },
        { element: 'logger', defaults: ['Logger', 'logger'] },
        { element: 'choice', defaults: ['Choice', 'choice'] },
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        for (const component of this.componentDefaults) {
            const elements = this.select(`//*[local-name()="${component.element}"]`, doc);

            for (const element of elements) {
                const docName = this.getDocName(element);

                if (!docName) {
                    continue; // Missing doc:name is handled by MULE-604
                }

                // Check if using default name
                if (component.defaults.some((d) => docName.toLowerCase() === d.toLowerCase())) {
                    issues.push(
                        this.createIssue(
                            element,
                            `${component.element} has generic name "${docName}"`,
                            {
                                suggestion: `Use a descriptive name explaining the purpose`,
                            },
                        ),
                    );
                }
            }
        }

        return issues;
    }
}
