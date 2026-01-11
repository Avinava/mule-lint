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
