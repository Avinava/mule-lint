import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-004: Hardcoded HTTP URLs
 * 
 * HTTP/HTTPS URLs should use property placeholders, not hardcoded values.
 * Hardcoded URLs make environment promotion difficult and can lead to errors.
 */
export class HardcodedHttpRule extends BaseRule {
    id = 'MULE-004';
    name = 'Hardcoded HTTP URLs';
    description = 'HTTP/HTTPS URLs should use property placeholders instead of hardcoded values';
    severity = 'error' as const;
    category = 'security' as const;

    // URL patterns to detect
    private readonly URL_PATTERN = /^https?:\/\//i;

    // Patterns that indicate the value is dynamic (allowed)
    private readonly ALLOWED_PATTERNS = [
        /\$\{[^}]+\}/,      // Property placeholders ${...}
        /#\[[^\]]+\]/,      // DataWeave expressions #[...]
        /p\(['"]/,          // Property function p('...')
    ];

    // Attributes that should be ignored (not user-configurable URLs)
    private readonly IGNORED_ATTRIBUTES = [
        'xmlns',
        'xsi:schemaLocation',
        'schemaLocation',
    ];

    // Attributes to check for URLs
    private readonly URL_ATTRIBUTES = [
        'url',
        'host',
        'path',
        'value',
        'uri',
        'address',
        'endpoint',
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Get all elements and check their attributes
        const allElements = doc.getElementsByTagName('*');

        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            const attrs = element.attributes;

            for (let j = 0; j < attrs.length; j++) {
                const attr = attrs[j];
                const attrName = attr.name;
                const value = attr.value;

                // Skip namespace declarations and schema locations
                if (this.isIgnoredAttribute(attrName)) {
                    continue;
                }

                // Check if this looks like a hardcoded URL
                if (this.isHardcodedUrl(value)) {
                    issues.push(this.createIssue(
                        element,
                        `Hardcoded URL "${this.truncate(value)}" found in attribute "${attrName}"`,
                        {
                            suggestion: 'Use property placeholder: ${http.baseUrl} or ${env.api.host}'
                        }
                    ));
                }
            }
        }

        return issues;
    }

    /**
     * Check if a value is a hardcoded URL
     */
    private isHardcodedUrl(value: string): boolean {
        // Must match URL pattern
        if (!this.URL_PATTERN.test(value)) {
            return false;
        }

        // Check if it contains any allowed dynamic pattern
        for (const pattern of this.ALLOWED_PATTERNS) {
            if (pattern.test(value)) {
                return false;
            }
        }

        // It's a hardcoded URL
        return true;
    }

    /**
     * Check if an attribute should be ignored
     */
    private isIgnoredAttribute(attrName: string): boolean {
        // Check exact match
        if (this.IGNORED_ATTRIBUTES.includes(attrName)) {
            return true;
        }
        // Check for xmlns: prefixed attributes
        if (attrName.startsWith('xmlns:')) {
            return true;
        }
        return false;
    }

    /**
     * Truncate long URLs for display
     */
    private truncate(value: string, maxLen = 50): string {
        if (value.length <= maxLen) {
            return value;
        }
        return value.substring(0, maxLen) + '...';
    }
}
