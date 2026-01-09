import * as xpath from 'xpath';

// DOM types from global lib.dom (used by @xmldom/xmldom)
// Note: @xmldom/xmldom uses standard DOM interfaces

/**
 * MuleSoft XML namespace mappings
 * These are the standard namespaces used in Mule 4 applications
 */
export const MULE_NAMESPACES: Record<string, string> = {
    // Core Mule
    mule: 'http://www.mulesoft.org/schema/mule/core',

    // HTTP Connector
    http: 'http://www.mulesoft.org/schema/mule/http',
    https: 'http://www.mulesoft.org/schema/mule/https',

    // DataWeave / EE
    ee: 'http://www.mulesoft.org/schema/mule/ee/core',

    // Documentation
    doc: 'http://www.mulesoft.org/schema/mule/documentation',

    // Security / TLS
    tls: 'http://www.mulesoft.org/schema/mule/tls',
    'secure-properties': 'http://www.mulesoft.org/schema/mule/secure-properties',

    // Database
    db: 'http://www.mulesoft.org/schema/mule/db',

    // File connectors
    file: 'http://www.mulesoft.org/schema/mule/file',
    sftp: 'http://www.mulesoft.org/schema/mule/sftp',
    ftp: 'http://www.mulesoft.org/schema/mule/ftp',

    // Messaging
    vm: 'http://www.mulesoft.org/schema/mule/vm',
    jms: 'http://www.mulesoft.org/schema/mule/jms',
    amqp: 'http://www.mulesoft.org/schema/mule/amqp',

    // API
    apikit: 'http://www.mulesoft.org/schema/mule/mule-apikit',
    'api-gateway': 'http://www.mulesoft.org/schema/mule/api-gateway',

    // Object Store
    os: 'http://www.mulesoft.org/schema/mule/os',

    // Batch
    batch: 'http://www.mulesoft.org/schema/mule/batch',

    // Salesforce
    salesforce: 'http://www.mulesoft.org/schema/mule/salesforce',

    // Email
    email: 'http://www.mulesoft.org/schema/mule/email',

    // Validation
    validation: 'http://www.mulesoft.org/schema/mule/validation',

    // Scripting
    scripting: 'http://www.mulesoft.org/schema/mule/scripting',

    // Java
    java: 'http://www.mulesoft.org/schema/mule/java',

    // Sockets
    sockets: 'http://www.mulesoft.org/schema/mule/sockets',

    // Web Service Consumer
    wsc: 'http://www.mulesoft.org/schema/mule/wsc',
};

/**
 * Helper class for namespace-aware XPath queries on Mule XML documents
 */
export class XPathHelper {
    private static instance: XPathHelper;
    private readonly select: xpath.XPathSelect;

    private constructor(customNamespaces?: Record<string, string>) {
        const namespaces = { ...MULE_NAMESPACES, ...customNamespaces };
        this.select = xpath.useNamespaces(namespaces);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(customNamespaces?: Record<string, string>): XPathHelper {
        if (!XPathHelper.instance) {
            XPathHelper.instance = new XPathHelper(customNamespaces);
        }
        return XPathHelper.instance;
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static reset(): void {
        XPathHelper.instance = undefined as unknown as XPathHelper;
    }

    /**
     * Execute XPath query and return matching nodes
     * @param expression - XPath expression (can use namespace prefixes like mule:flow)
     * @param context - Document or Node to query
     * @returns Array of matching nodes
     */
    public selectNodes(expression: string, context: Document | Node): Node[] {
        try {
            const result = this.select(expression, context);
            if (Array.isArray(result)) {
                return result;
            }
            return [];
        } catch (error) {
            console.error(`XPath error for expression "${expression}":`, error);
            return [];
        }
    }

    /**
     * Execute XPath query and return first matching node
     * @param expression - XPath expression
     * @param context - Document or Node to query
     * @returns First matching node or null
     */
    public selectNode(expression: string, context: Document | Node): Node | null {
        const nodes = this.selectNodes(expression, context);
        return nodes.length > 0 ? nodes[0] : null;
    }

    /**
     * Execute XPath query and return string value
     * @param expression - XPath expression
     * @param context - Document or Node to query
     * @returns String value or null
     */
    public selectString(expression: string, context: Document | Node): string | null {
        try {
            const result = this.select(`string(${expression})`, context);
            return typeof result === 'string' && result.length > 0 ? result : null;
        } catch {
            return null;
        }
    }

    /**
     * Check if any nodes match the XPath expression
     * @param expression - XPath expression
     * @param context - Document or Node to query
     * @returns true if at least one node matches
     */
    public exists(expression: string, context: Document | Node): boolean {
        return this.selectNodes(expression, context).length > 0;
    }

    /**
     * Count nodes matching the XPath expression
     * @param expression - XPath expression
     * @param context - Document or Node to query
     * @returns Number of matching nodes
     */
    public count(expression: string, context: Document | Node): number {
        return this.selectNodes(expression, context).length;
    }
}

/**
 * Utility functions for working with XML nodes
 */
export function getAttribute(node: Node, attrName: string): string | null {
    const element = node as Element;
    if (element.getAttribute) {
        const value = element.getAttribute(attrName);
        return value || null;
    }
    return null;
}

/**
 * Get line number from a parsed node (xmldom stores this)
 */
export function getLineNumber(node: Node): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return (node as any).lineNumber ?? 1;
}

/**
 * Get column number from a parsed node
 */
export function getColumnNumber(node: Node): number | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return (node as any).columnNumber;
}

/**
 * Check if a node has a specific attribute
 */
export function hasAttribute(node: Node, attrName: string): boolean {
    const element = node as Element;
    return element.hasAttribute?.(attrName) ?? false;
}

/**
 * Get the local name of a node (without namespace prefix)
 */
export function getLocalName(node: Node): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return (node as any).localName ?? node.nodeName;
}

/**
 * Get text content of a node
 */
export function getTextContent(node: Node): string {
    return node.textContent ?? '';
}
