import { Rule, Issue, Severity, RuleCategory, ValidationContext, RuleConfig, IssueType } from '../../types';
import {
    XPathHelper,
    getAttribute,
    getLineNumber,
    getColumnNumber,
    hasAttribute,
} from '../../core/XPathHelper';

/**
 * Abstract base class for all lint rules
 * Provides common utilities for XPath queries and issue creation
 */
export abstract class BaseRule implements Rule {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract severity: Severity;
    abstract category: RuleCategory;

    /** Issue type for quality metrics - defaults to 'code-smell' */
    issueType: IssueType = 'code-smell';
    docsUrl?: string;

    protected xpath: XPathHelper;

    constructor() {
        this.xpath = XPathHelper.getInstance();
    }

    /**
     * Main validation method - must be implemented by each rule
     */
    abstract validate(doc: Document, context: ValidationContext): Issue[];

    // --- Protected Utility Methods ---

    /**
     * Execute XPath query and return matching nodes
     */
    protected select(expression: string, context: Document | Node): Node[] {
        return this.xpath.selectNodes(expression, context);
    }

    /**
     * Execute XPath query and return first matching node
     */
    protected selectFirst(expression: string, context: Document | Node): Node | null {
        return this.xpath.selectNode(expression, context);
    }

    /**
     * Check if any nodes match the XPath expression
     */
    protected exists(expression: string, context: Document | Node): boolean {
        return this.xpath.exists(expression, context);
    }

    /**
     * Count nodes matching the XPath expression
     */
    protected count(expression: string, context: Document | Node): number {
        return this.xpath.count(expression, context);
    }

    /**
     * Create an issue with consistent formatting
     */
    protected createIssue(
        node: Node,
        message: string,
        options?: {
            suggestion?: string;
            severity?: Severity;
            codeSnippet?: string;
        },
    ): Issue {
        return {
            line: this.getLineNumber(node),
            column: this.getColumnNumber(node),
            message,
            ruleId: this.id,
            severity: options?.severity ?? this.severity,
            suggestion: options?.suggestion,
            codeSnippet: options?.codeSnippet,
        };
    }

    /**
     * Create an issue without a node reference (e.g., for file-level checks)
     */
    protected createFileIssue(
        message: string,
        options?: {
            suggestion?: string;
            severity?: Severity;
            line?: number;
        },
    ): Issue {
        return {
            line: options?.line ?? 1,
            message,
            ruleId: this.id,
            severity: options?.severity ?? this.severity,
            suggestion: options?.suggestion,
        };
    }

    /**
     * Get line number from node
     */
    protected getLineNumber(node: Node): number {
        return getLineNumber(node);
    }

    /**
     * Get column number from node
     */
    protected getColumnNumber(node: Node): number | undefined {
        return getColumnNumber(node);
    }

    /**
     * Get attribute value from node
     */
    protected getAttribute(node: Node, attrName: string): string | null {
        return getAttribute(node, attrName);
    }

    /**
     * Check if node has attribute
     */
    protected hasAttribute(node: Node, attrName: string): boolean {
        return hasAttribute(node, attrName);
    }

    /**
     * Get the name attribute (common in Mule elements)
     */
    protected getNameAttribute(node: Node): string | null {
        return this.getAttribute(node, 'name');
    }

    /**
     * Get doc:name attribute (Mule display name)
     */
    protected getDocName(node: Node): string | null {
        return this.getAttribute(node, 'doc:name');
    }

    /**
     * Get an option from rule configuration
     */
    protected getOption<T>(context: ValidationContext, key: string, defaultValue: T): T {
        const options = context.config.options;
        if (options && key in options) {
            return options[key] as T;
        }
        return defaultValue;
    }

    /**
     * Check if a pattern should be excluded
     */
    protected isExcluded(value: string, patterns: string[]): boolean {
        return patterns.some((pattern) => {
            // Simple wildcard matching
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(value);
            }
            return value === pattern;
        });
    }

    /**
     * Get default rule configuration
     */
    public getDefaultConfig(): RuleConfig {
        return {
            enabled: true,
            severity: this.severity,
            options: {},
        };
    }
}
