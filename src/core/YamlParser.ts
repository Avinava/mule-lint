import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * YAML Parser for MuleSoft properties files
 */
export class YamlParser {
    /**
     * Parse a YAML file and return its contents
     */
    static parseFile(filePath: string): Record<string, unknown> | null {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return yaml.load(content) as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    /**
     * Parse YAML string content
     */
    static parse(content: string): Record<string, unknown> | null {
        try {
            return yaml.load(content) as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    /**
     * Check if a file is a YAML file
     */
    static isYamlFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ext === '.yaml' || ext === '.yml';
    }

    /**
     * Get all keys from a YAML object (flattened)
     */
    static getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
        const keys: string[] = [];

        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.getAllKeys(value as Record<string, unknown>, fullKey));
            } else {
                keys.push(fullKey);
            }
        }

        return keys;
    }

    /**
     * Check if a value appears to be an encrypted secure property
     */
    static isEncryptedValue(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        // MuleSoft encrypted values use ![...] format
        return /^!\[.*\]$/.test(value);
    }

    /**
     * Check if a key name suggests it contains sensitive data
     * Uses word-boundary matching to avoid false positives
     */
    static isSensitiveKey(key: string): boolean {
        const lowerKey = key.toLowerCase();

        // Patterns that indicate a secret - must be at word boundary (end of key or before .)
        const secretKeyEndings = [
            'password',
            'passwd',
            'secret',
            'apikey',
            'api-key',
            'api_key',
            'accesstoken',
            'access-token',
            'access_token',
            'refreshtoken',
            'refresh-token',
            'refresh_token',
            'clientsecret',
            'client-secret',
            'client_secret',
            'privatekey',
            'private-key',
            'private_key',
            'credentials',
            'authtoken',
            'auth-token',
            'auth_token',
            'bearertoken',
            'bearer-token',
            'bearer_token',
            'consumerkey',
            'consumer-key',
            'consumer_key',
            'consumersecret',
            'consumer-secret',
            'consumer_secret',
            'tokensecret',
            'token-secret',
            'token_secret',
        ];

        // Get the last segment of the key (after the last .)
        const segments = lowerKey.split('.');
        const lastSegment = segments[segments.length - 1];

        // Check if the last segment matches any secret pattern
        return secretKeyEndings.some(
            (pattern) => lastSegment === pattern || lastSegment.endsWith(pattern),
        );
    }
}
