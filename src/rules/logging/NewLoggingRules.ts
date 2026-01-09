import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * LOG-001: Structured Logging Check
 *
 * Recommends JSON logger format over plain text for production
 * applications to enable better log parsing and analysis.
 */
export class StructuredLoggingRule extends BaseRule {
    id = 'LOG-001';
    name = 'Structured Logging';
    description = 'Recommend JSON logger format over plain text';
    severity = 'info' as const;
    category = 'logging' as const;

    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Check if this is global.xml or a config file
        if (
            !context.relativePath.includes('global') &&
            !context.relativePath.includes('config')
        ) {
            return issues;
        }

        // Look for JSON logger module configuration
        const jsonLoggerConfig = this.select(
            '//*[contains(local-name(), "json-logger") or contains(local-name(), "jsonlogger")]',
            doc,
        );

        // Look for standard logger elements
        const standardLoggers = this.select('//*[local-name()="logger"]', doc);

        // If using standard loggers but no JSON logger configured
        if (standardLoggers.length > 0 && jsonLoggerConfig.length === 0) {
            issues.push(
                this.createIssue(
                    standardLoggers[0],
                    'Project uses standard logger instead of JSON structured logging',
                    {
                        suggestion:
                            'Consider using JSON Logger Module for structured logging in production. This enables better log aggregation and analysis.',
                    },
                ),
            );
        }

        return issues;
    }
}

/**
 * LOG-004: Sensitive Data Logging Check
 *
 * Detects logging of sensitive data patterns (passwords, SSN, credit cards)
 * which is a security and compliance violation.
 * 
 * This rule looks for patterns where sensitive VARIABLE VALUES are being logged,
 * not just contextual words like "token expired" or "password reset".
 */
export class SensitiveDataLoggingRule extends BaseRule {
    id = 'LOG-004';
    name = 'Sensitive Data in Logs';
    description = 'Log statements should not contain sensitive data values';
    severity = 'error' as const;
    category = 'logging' as const;

    // Patterns that suggest actual sensitive VALUES are being logged
    // e.g., "password: " ++ password, vars.token, payload.secret
    private readonly sensitiveValuePatterns = [
        /vars\.(password|secret|token|apiKey|privateKey|accessToken|refreshToken|ssn|pin)\b/i,
        /payload\.(password|secret|token|apiKey|privateKey|accessToken|refreshToken|ssn|pin)\b/i,
        /attributes\.(password|secret|token)\b/i,
        /\$\{.*password.*\}/i,
        /\$\{.*secret.*\}/i,
        /\$\{secure::.*\}/i, // Logging secure properties is bad
        /\+\+\s*(password|secret|token|apiKey)\b/i, // Concatenating sensitive vars
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Find all logger elements (standard and json-logger)
        const loggers = this.select('//*[local-name()="logger"]', doc);

        for (const logger of loggers) {
            const element = logger as Element;
            const message = element.getAttribute('message') || '';

            // Only check if it contains DataWeave expressions
            if (!message.includes('#[') && !message.includes('${')) {
                continue;
            }

            // Check for patterns that suggest actual values are being logged
            for (const pattern of this.sensitiveValuePatterns) {
                if (pattern.test(message)) {
                    issues.push(
                        this.createIssue(
                            logger,
                            `Logger may expose sensitive data value: pattern "${pattern.source}" detected`,
                            {
                                suggestion:
                                    'Mask sensitive data before logging using DataWeave masking functions or remove the sensitive variable reference',
                            },
                        ),
                    );
                    break; // Only report once per logger
                }
            }
        }

        return issues;
    }
}

