import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { isEncryptedValue, isSensitiveKey } from './SensitiveKeys';

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
    return isEncryptedValue(value);
  }

  /**
   * Check if a key name suggests it contains sensitive data
   * Uses word-boundary matching to avoid false positives
   */
  static isSensitiveKey(key: string): boolean {
    return isSensitiveKey(key);
  }
}
