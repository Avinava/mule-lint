import * as fs from 'fs';
import * as path from 'path';

/**
 * A single key/value pair parsed from a Java `.properties` file.
 */
export interface PropertyEntry {
  /** Key with escapes resolved */
  key: string;
  /** Value with escapes and continuations resolved */
  value: string;
  /** 1-indexed line on which the entry starts */
  line: number;
}

/**
 * Parser for Java `.properties` files.
 *
 * Implements the subset of `java.util.Properties` syntax that appears in Mule
 * configuration: comments, the three separator forms, escaped separators in
 * keys, backslash continuations, and `\uXXXX` escapes. It deliberately performs no environment
 * interpolation and evaluates no expressions — a value is returned exactly as
 * written so callers can decide whether it is a literal or a placeholder.
 */

/** True when the backslash run ending at `index` leaves the character escaped. */
function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  let cursor = index - 1;
  while (cursor >= 0 && text[cursor] === '\\') {
    backslashes++;
    cursor--;
  }
  return backslashes % 2 === 1;
}

/** Resolve `\:`, `\=`, `\ `, `\\`, and the standard control escapes. */
function unescape(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? '';
    if (char !== '\\') {
      result += char;
      continue;
    }
    const next = text[++i];
    if (next === undefined) {
      break;
    }
    switch (next) {
      case 'n':
        result += '\n';
        break;
      case 'r':
        result += '\r';
        break;
      case 't':
        result += '\t';
        break;
      case 'f':
        result += '\f';
        break;
      case 'u': {
        // Java decodes \uXXXX before anything else sees the key, so
        // `db.pass\u0077ord` is really `db.password` at runtime.
        const hex = text.slice(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else {
          // Not a valid escape; Java would reject the file, so keep the
          // character rather than inventing a replacement.
          result += next;
        }
        break;
      }
      default:
        // Covers \: \= \  \\ \# \! and any other escaped literal
        result += next;
    }
  }
  return result;
}

/**
 * Split a logical line into its key and value at the first unescaped separator.
 *
 * Separators are `=`, `:`, or whitespace, whichever appears first. An optional
 * `=` or `:` directly after whitespace is absorbed into the separator, so
 * `key = value` and `key : value` both yield `value`.
 */
function splitEntry(logicalLine: string): { key: string; value: string } | null {
  let separatorIndex = -1;
  let separatorLength = 0;

  for (let i = 0; i < logicalLine.length; i++) {
    const char = logicalLine[i];
    if (char === undefined || isEscaped(logicalLine, i)) {
      continue;
    }

    if (char === '=' || char === ':') {
      separatorIndex = i;
      separatorLength = 1;
      break;
    }

    if (char === ' ' || char === '\t' || char === '\f') {
      separatorIndex = i;
      separatorLength = 1;
      // Absorb following whitespace and at most one '=' or ':'
      let cursor = i + 1;
      while (cursor < logicalLine.length && /[ \t\f]/.test(logicalLine[cursor] ?? '')) {
        cursor++;
      }
      const candidate = logicalLine[cursor];
      if (candidate === '=' || candidate === ':') {
        cursor++;
      }
      separatorLength = cursor - i;
      break;
    }
  }

  if (separatorIndex === -1) {
    // A key with no separator is a valid entry with an empty value
    const bareKey = unescape(logicalLine).trim();
    return bareKey.length > 0 ? { key: bareKey, value: '' } : null;
  }

  const rawKey = logicalLine.slice(0, separatorIndex);
  const rawValue = logicalLine.slice(separatorIndex + separatorLength);

  const key = unescape(rawKey).trim();
  if (key.length === 0) {
    return null;
  }

  return { key, value: unescape(rawValue.replace(/^[ \t\f]+/, '')) };
}

/**
 * Parse `.properties` content into entries.
 *
 * Duplicate keys are preserved as separate entries so every plaintext
 * occurrence can be reported with its own line number; callers wanting Java's
 * last-wins semantics should take the final entry for a key.
 */
export function parseProperties(content: string): PropertyEntry[] {
  const entries: PropertyEntry[] = [];
  const lines = content.split(/\r\n|\r|\n/);

  for (let i = 0; i < lines.length; i++) {
    const startLine = i + 1;
    let logical = lines[i] ?? '';
    const trimmed = logical.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('!')) {
      continue;
    }

    logical = logical.replace(/^[ \t\f]+/, '');

    // Join continuation lines ending in an unescaped backslash
    while (logical.endsWith('\\') && !isEscaped(logical, logical.length - 1)) {
      logical = logical.slice(0, -1);
      const next = lines[++i];
      if (next === undefined) {
        break;
      }
      logical += next.replace(/^[ \t\f]+/, '');
    }

    const entry = splitEntry(logical);
    if (entry) {
      entries.push({ key: entry.key, value: entry.value, line: startLine });
    }
  }

  return entries;
}

/**
 * Parse a `.properties` file from disk. Returns an empty array when the file
 * cannot be read, so one unreadable resource never aborts a scan.
 */
export function parsePropertiesFile(filePath: string): PropertyEntry[] {
  try {
    return parseProperties(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Check whether a path is a Java `.properties` file.
 */
export function isPropertiesFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.properties';
}
