import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';

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

  // NetSuite
  netsuite: 'http://www.mulesoft.org/schema/mule/netsuite',

  // SAP
  sap: 'http://www.mulesoft.org/schema/mule/sap',

  // Anypoint MQ
  'anypoint-mq': 'http://www.mulesoft.org/schema/mule/anypoint-mq',

  // OAuth
  oauth: 'http://www.mulesoft.org/schema/mule/oauth',
};

/**
 * Extended Node interface with properties added by @xmldom/xmldom
 */
export interface XmlDomNode extends Node {
  lineNumber?: number;
  columnNumber?: number;
  localName?: string;
}

/**
 * Helper class for namespace-aware XPath queries on Mule XML documents
 */
export class XPathHelper {
  private static instance: XPathHelper | undefined;
  private readonly select: xpath.XPathSelect;

  private constructor(namespaces: Record<string, string> = MULE_NAMESPACES) {
    this.select = xpath.useNamespaces(namespaces);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): XPathHelper {
    if (!XPathHelper.instance) {
      XPathHelper.instance = new XPathHelper();
    }
    return XPathHelper.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    XPathHelper.instance = undefined;
  }

  /**
   * Build a helper with extra namespace prefixes alongside the built-in ones.
   *
   * Returns a new instance rather than mutating the singleton, so a custom rule
   * file can never change how built-in rules resolve their prefixes.
   *
   * @param extraNamespaces - Additional prefix to URI mappings
   * @throws When a prefix would redefine a built-in mapping
   */
  public static withNamespaces(extraNamespaces: Record<string, string>): XPathHelper {
    for (const prefix of Object.keys(extraNamespaces)) {
      if (prefix in MULE_NAMESPACES) {
        throw new Error(
          `Namespace prefix "${prefix}" is built in and cannot be redefined by a custom rule file`,
        );
      }
    }

    // A fresh instance over the merged map; the singleton is untouched.
    return new XPathHelper({ ...MULE_NAMESPACES, ...extraNamespaces });
  }

  /**
   * Parse an XPath expression, throwing when it is not valid.
   *
   * Evaluated against a minimal document so a syntax error surfaces at
   * configuration time rather than as a rule that silently matches nothing on
   * every file. Uses the same namespace bindings this helper was built with,
   * so an unbound prefix is also rejected here.
   *
   * @param expression - XPath expression to compile
   * @throws When the expression cannot be parsed
   */
  public compile(expression: string): void {
    const probeDocument = new DOMParser().parseFromString('<probe/>', 'text/xml');
    // Errors propagate deliberately; selectNodes() would swallow them.
    this.select(expression, probeDocument);
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
      // eslint-disable-next-line no-console -- XPath diagnostics must remain visible to API consumers.
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
    return nodes[0] ?? null;
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
  return element.getAttribute(attrName) || null;
}

/**
 * Get line number from a parsed node (xmldom stores this)
 */
export function getLineNumber(node: Node): number {
  return (node as XmlDomNode).lineNumber ?? 1;
}

/**
 * Get column number from a parsed node
 */
export function getColumnNumber(node: Node): number | undefined {
  return (node as XmlDomNode).columnNumber;
}

/**
 * Check if a node has a specific attribute
 */
export function hasAttribute(node: Node, attrName: string): boolean {
  const element = node as Element;
  return element.hasAttribute(attrName);
}

/**
 * Get the local name of a node (without namespace prefix)
 */
export function getLocalName(node: Node): string {
  return (node as XmlDomNode).localName ?? node.nodeName;
}

/**
 * Get text content of a node
 */
export function getTextContent(node: Node): string {
  return node.textContent ?? '';
}
