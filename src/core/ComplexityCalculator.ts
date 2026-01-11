import { getLineNumber } from './XPathHelper';

/**
 * Calculates cyclomatic complexity for Mule flows
 *
 * Complexity = 1 + (number of decision points)
 *
 * Decision points in Mule XML:
 * - <choice> with N <when> clauses = N decision points
 * - <until-successful> = 1 decision point (retry logic)
 * - <foreach> = 1 decision point (iteration)
 * - <parallel-foreach> = 1 decision point (parallel iteration)
 * - <scatter-gather> = 1 decision point (parallel execution)
 * - <try> = 1 decision point (exception handling)
 * - <async> = 1 decision point (parallel execution path)
 * - <first-successful> = 1 decision point (fallback routing)
 * - <round-robin> = 1 decision point (load balancing)
 * - <on-error-continue/propagate> = 1 decision point each (error handlers)
 */
export class ComplexityCalculator {
    /**
     * Calculate cyclomatic complexity for a flow element
     */
    static calculateFlowComplexity(flowNode: Node): ComplexityResult {
        let complexity = 1; // Base complexity
        const details: ComplexityDetail[] = [];

        // Count choice/when clauses
        const whenClauses = this.selectNodes('.//mule:when', flowNode);
        if (whenClauses.length > 0) {
            complexity += whenClauses.length;
            details.push({
                type: 'choice/when',
                count: whenClauses.length,
                contribution: whenClauses.length,
            });
        }

        // Count until-successful (retry logic)
        const untilSuccessful = this.selectNodes('.//mule:until-successful', flowNode);
        if (untilSuccessful.length > 0) {
            complexity += untilSuccessful.length;
            details.push({
                type: 'until-successful',
                count: untilSuccessful.length,
                contribution: untilSuccessful.length,
            });
        }

        // Count foreach (iteration)
        const foreach = this.selectNodes('.//mule:foreach', flowNode);
        if (foreach.length > 0) {
            complexity += foreach.length;
            details.push({
                type: 'foreach',
                count: foreach.length,
                contribution: foreach.length,
            });
        }

        // Count parallel-foreach (parallel iteration)
        const parallelForeach = this.selectNodes('.//mule:parallel-foreach', flowNode);
        if (parallelForeach.length > 0) {
            complexity += parallelForeach.length;
            details.push({
                type: 'parallel-foreach',
                count: parallelForeach.length,
                contribution: parallelForeach.length,
            });
        }

        // Count scatter-gather (parallel execution)
        const scatterGather = this.selectNodes('.//mule:scatter-gather', flowNode);
        if (scatterGather.length > 0) {
            complexity += scatterGather.length;
            details.push({
                type: 'scatter-gather',
                count: scatterGather.length,
                contribution: scatterGather.length,
            });
        }

        // Count async (parallel execution path)
        const asyncScopes = this.selectNodes('.//mule:async', flowNode);
        if (asyncScopes.length > 0) {
            complexity += asyncScopes.length;
            details.push({
                type: 'async',
                count: asyncScopes.length,
                contribution: asyncScopes.length,
            });
        }

        // Count try scopes (exception handling)
        const tryScopes = this.selectNodes('.//mule:try', flowNode);
        if (tryScopes.length > 0) {
            complexity += tryScopes.length;
            details.push({
                type: 'try',
                count: tryScopes.length,
                contribution: tryScopes.length,
            });
        }

        // Count first-successful (fallback routing)
        const firstSuccessful = this.selectNodes('.//mule:first-successful', flowNode);
        if (firstSuccessful.length > 0) {
            complexity += firstSuccessful.length;
            details.push({
                type: 'first-successful',
                count: firstSuccessful.length,
                contribution: firstSuccessful.length,
            });
        }

        // Count round-robin (load balancing)
        const roundRobin = this.selectNodes('.//mule:round-robin', flowNode);
        if (roundRobin.length > 0) {
            complexity += roundRobin.length;
            details.push({
                type: 'round-robin',
                count: roundRobin.length,
                contribution: roundRobin.length,
            });
        }

        // Count on-error handlers (each error type adds complexity)
        const errorHandlers = this.selectNodes(
            './/mule:on-error-continue | .//mule:on-error-propagate',
            flowNode,
        );
        if (errorHandlers.length > 0) {
            complexity += errorHandlers.length;
            details.push({
                type: 'error-handler',
                count: errorHandlers.length,
                contribution: errorHandlers.length,
            });
        }

        return {
            complexity,
            details,
            rating: this.getRating(complexity),
        };
    }

    /**
     * Get complexity rating
     */
    static getRating(complexity: number): ComplexityRating {
        if (complexity <= 10) return 'low';
        if (complexity <= 20) return 'moderate';
        return 'high';
    }

    /**
     * Helper to select nodes using XPath with Mule namespace
     */
    private static selectNodes(xpath: string, contextNode: Node): Node[] {
        const select = require('xpath').useNamespaces({
            mule: 'http://www.mulesoft.org/schema/mule/core',
        });

        try {
            const doc = contextNode.ownerDocument || contextNode;
            return select(xpath, contextNode) as Node[];
        } catch {
            return [];
        }
    }

    /**
     * Calculate cognitive complexity for a flow element
     *
     * Cognitive complexity differs from cyclomatic complexity by:
     * - Adding 1 for each nesting level of control structures
     * - Focus on how hard code is to understand, not test paths
     *
     * Formula: For each control structure, add (1 + nesting depth)
     */
    static calculateCognitiveComplexity(flowNode: Node): CognitiveComplexityResult {
        let cognitiveComplexity = 0;
        const details: CognitiveDetail[] = [];

        // Nesting elements that increase complexity based on depth
        const nestingElements = [
            'choice',
            'foreach',
            'parallel-foreach',
            'scatter-gather',
            'try',
            'async',
            'until-successful',
            'first-successful',
            'round-robin',
        ];

        for (const elementType of nestingElements) {
            const nodes = this.selectNodes(`.//mule:${elementType}`, flowNode);
            for (const node of nodes) {
                const depth = this.calculateNestingDepth(node, flowNode, nestingElements);
                const contribution = 1 + depth; // Base 1 + nesting increment
                cognitiveComplexity += contribution;
                details.push({
                    element: elementType,
                    nestingDepth: depth,
                    contribution,
                });
            }
        }

        // When clauses inside choice add complexity but don't increase nesting
        const whenClauses = this.selectNodes('.//mule:when', flowNode);
        if (whenClauses.length > 0) {
            // Each when after the first adds 1
            const contribution = whenClauses.length > 1 ? whenClauses.length - 1 : 0;
            cognitiveComplexity += contribution;
            if (contribution > 0) {
                details.push({
                    element: 'additional-when-clauses',
                    nestingDepth: 0,
                    contribution,
                });
            }
        }

        // Error handlers add complexity with nesting
        const errorHandlers = this.selectNodes(
            './/mule:on-error-continue | .//mule:on-error-propagate',
            flowNode,
        );
        for (const node of errorHandlers) {
            const depth = this.calculateNestingDepth(node, flowNode, nestingElements);
            const contribution = 1 + depth;
            cognitiveComplexity += contribution;
            details.push({
                element: 'error-handler',
                nestingDepth: depth,
                contribution,
            });
        }

        return {
            cognitiveComplexity,
            details,
            rating: this.getCognitiveRating(cognitiveComplexity),
        };
    }

    /**
     * Calculate nesting depth of a node relative to flow root
     */
    private static calculateNestingDepth(
        node: Node,
        flowRoot: Node,
        nestingElements: string[],
    ): number {
        let depth = 0;
        let current = node.parentNode;

        while (current && current !== flowRoot) {
            const localName = (current as Element).localName || '';
            if (nestingElements.includes(localName)) {
                depth++;
            }
            current = current.parentNode;
        }

        return depth;
    }

    /**
     * Get cognitive complexity rating
     * Thresholds are lower than cyclomatic because cognitive is harder
     */
    static getCognitiveRating(complexity: number): ComplexityRating {
        if (complexity <= 8) return 'low';
        if (complexity <= 15) return 'moderate';
        return 'high';
    }

    /**
     * Get the line number for a node
     */
    static getNodeLine(node: Node): number {
        return getLineNumber(node);
    }
}

export interface ComplexityResult {
    complexity: number;
    details: ComplexityDetail[];
    rating: ComplexityRating;
}

export interface ComplexityDetail {
    type: string;
    count: number;
    contribution: number;
}

export type ComplexityRating = 'low' | 'moderate' | 'high';

export interface CognitiveComplexityResult {
    cognitiveComplexity: number;
    details: CognitiveDetail[];
    rating: ComplexityRating;
}

export interface CognitiveDetail {
    element: string;
    nestingDepth: number;
    contribution: number;
}
