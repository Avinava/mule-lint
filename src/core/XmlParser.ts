import { DOMParser } from '@xmldom/xmldom';

/**
 * Result of parsing an XML file
 */
export interface ParseResult {
    /** Whether parsing was successful */
    success: boolean;
    /** The parsed document (if successful) */
    document?: Document;
    /** Parse error message (if failed) */
    error?: string;
    /** Line number of parse error (if available) */
    errorLine?: number;
    /** Column number of parse error (if available) */
    errorColumn?: number;
}

/**
 * Error handler for DOM parser
 */
interface ParserError {
    message: string;
    line?: number;
    column?: number;
}

/**
 * Parse XML content into a DOM Document
 *
 * @param content - XML content as string
 * @param filePath - File path for error messages (optional)
 * @returns ParseResult with document or error information
 */
export function parseXml(content: string, filePath?: string): ParseResult {
    const errors: ParserError[] = [];
    const warnings: ParserError[] = [];

    const parser = new DOMParser({
        // Enable line/column tracking for parsed nodes (use {} for xmldom 0.8.x)
        locator: {},
        errorHandler: {
            warning: (msg: string) => {
                warnings.push({ message: msg });
            },
            error: (msg: string) => {
                errors.push(parseErrorLocation(msg));
            },
            fatalError: (msg: string) => {
                errors.push(parseErrorLocation(msg));
            },
        },
    });

    try {
        const document = parser.parseFromString(content, 'application/xml');

        // Check for critical errors
        if (errors.length > 0) {
            const firstError = errors[0];
            return {
                success: false,
                error: formatParseError(firstError, filePath),
                errorLine: firstError.line,
                errorColumn: firstError.column,
            };
        }

        // Verify document has a root element
        if (!document.documentElement) {
            return {
                success: false,
                error: `No root element found${filePath ? ` in ${filePath}` : ''}`,
            };
        }

        return {
            success: true,
            document,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: `XML parsing failed${filePath ? ` for ${filePath}` : ''}: ${message}`,
        };
    }
}

/**
 * Parse error location from error message
 * xmldom errors often contain line/column info in the message
 */
function parseErrorLocation(message: string): ParserError {
    // Try to extract line and column from error message
    // Format: "error at line X column Y: message"
    const lineMatch = message.match(/line[:\s]+(\d+)/i);
    const colMatch = message.match(/col(?:umn)?[:\s]+(\d+)/i);

    return {
        message,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        column: colMatch ? parseInt(colMatch[1], 10) : undefined,
    };
}

/**
 * Format parse error for display
 */
function formatParseError(error: ParserError, filePath?: string): string {
    let msg = 'XML parse error';
    if (filePath) {
        msg += ` in ${filePath}`;
    }
    if (error.line) {
        msg += ` at line ${error.line}`;
        if (error.column) {
            msg += `, column ${error.column}`;
        }
    }
    msg += `: ${error.message}`;
    return msg;
}

/**
 * Check if content appears to be valid XML (quick check)
 * This does NOT fully validate, just checks for obvious non-XML
 */
export function looksLikeXml(content: string): boolean {
    const trimmed = content.trim();

    // Must start with <
    if (!trimmed.startsWith('<')) {
        return false;
    }

    // Check for XML declaration or root element
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<!') || trimmed.match(/^<[a-zA-Z]/)) {
        return true;
    }

    return false;
}

/**
 * Extract XML declaration info
 */
export interface XmlDeclaration {
    version?: string;
    encoding?: string;
    standalone?: string;
}

export function getXmlDeclaration(content: string): XmlDeclaration | null {
    const match = content.match(/<\?xml\s+([^?]+)\?>/);
    if (!match) {
        return null;
    }

    const declaration: XmlDeclaration = {};
    const attrs = match[1];

    const versionMatch = attrs.match(/version\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
        declaration.version = versionMatch[1];
    }

    const encodingMatch = attrs.match(/encoding\s*=\s*["']([^"']+)["']/);
    if (encodingMatch) {
        declaration.encoding = encodingMatch[1];
    }

    const standaloneMatch = attrs.match(/standalone\s*=\s*["']([^"']+)["']/);
    if (standaloneMatch) {
        declaration.standalone = standaloneMatch[1];
    }

    return declaration;
}
