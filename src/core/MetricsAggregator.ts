import { LintReport, ProjectMetrics } from '../types/Report';
import {
    calculateGrade,
    calculateDebtMinutes,
    estimateDevelopmentMinutes,
    calculateDebtRatio,
    formatTechDebt,
    RatingGrade,
} from '../quality';
import { ALL_RULES } from '../rules';
import { IssueType } from '../types';

/**
 * Rating type for metrics (SonarQube-style A-E)
 * @deprecated Use RatingGrade from quality module instead
 */
export type MetricRating = RatingGrade;

/**
 * Build a lookup map of rule ID -> issueType
 * This is built once and cached for performance
 */
const ruleIssueTypeMap: Map<string, IssueType> = new Map();
for (const rule of ALL_RULES) {
    ruleIssueTypeMap.set(rule.id, rule.issueType || 'code-smell');
}

/**
 * Get issue type for a rule ID
 * Falls back to 'code-smell' if rule not found
 */
function getIssueTypeForRule(ruleId: string): IssueType {
    return ruleIssueTypeMap.get(ruleId) || 'code-smell';
}

/**
 * Aggregates and calculates quality metrics for lint reports
 *
 * Uses centralized quality scoring from src/quality/ for consistent
 * rating calculations across the codebase.
 */
export class MetricsAggregator {
    /**
     * Calculate complexity rating based on average flow complexity
     * Delegates to centralized calculator
     */
    static getComplexityRating(avgComplexity: number): MetricRating {
        return calculateGrade('complexity', avgComplexity);
    }

    /**
     * Calculate file complexity rating based on flow count
     * This matches mule-sonarqube-plugin's logic:
     * - Simple (A): ≤ 7 flows
     * - Medium (B): 8-14 flows
     * - Complex (C+): ≥ 15 flows
     */
    static getFileComplexityRating(flowCount: number): MetricRating {
        if (flowCount <= 7) return 'A';
        if (flowCount <= 14) return 'B';
        if (flowCount <= 21) return 'C';
        if (flowCount <= 30) return 'D';
        return 'E';
    }

    /**
     * Calculate maintainability rating based on technical debt ratio
     * Delegates to centralized calculator
     */
    static getMaintainabilityRating(debtRatioPercent: number): MetricRating {
        return calculateGrade('maintainability', debtRatioPercent);
    }

    /**
     * Calculate reliability rating based on bug count
     * Delegates to centralized calculator
     */
    static getReliabilityRating(bugCount: number): MetricRating {
        return calculateGrade('reliability', bugCount);
    }

    /**
     * Calculate security rating based on vulnerability count
     * Delegates to centralized calculator
     */
    static getSecurityRating(vulnerabilityCount: number): MetricRating {
        return calculateGrade('security', vulnerabilityCount);
    }

    /**
     * Format time duration from minutes
     * Delegates to centralized formatter
     */
    static formatDuration(minutes: number): string {
        return formatTechDebt(minutes);
    }

    /**
     * Aggregate metrics from a lint report
     * Computes complexity, maintainability, reliability, and security ratings
     */
    static aggregateMetrics(report: LintReport): ProjectMetrics | undefined {
        if (!report.metrics) return undefined;

        const metrics = report.metrics;

        // Calculate complexity aggregates from flow data
        const flowData = metrics.flowComplexityData || [];
        const totalComplexity = flowData.reduce((sum, f) => sum + f.complexity, 0);
        const avgComplexity = flowData.length > 0 ? totalComplexity / flowData.length : 0;
        const highestFlow = flowData.reduce(
            (max, f) => (f.complexity > (max?.complexity || 0) ? f : max),
            flowData[0],
        );

        // Classify issues by type using rule metadata
        const { bugs, vulnerabilities, codeSmells, hotspots } = this.classifyIssues(report);

        // Calculate technical debt using centralized calculator
        const debtMinutes = calculateDebtMinutes(codeSmells, bugs, vulnerabilities);

        // Estimate development time using centralized calculator
        const estimatedDevMinutes = estimateDevelopmentMinutes(
            metrics.flowCount,
            metrics.subFlowCount,
        );
        const debtRatio = calculateDebtRatio(debtMinutes, estimatedDevMinutes);

        // Build enhanced metrics with centralized ratings
        return {
            ...metrics,
            complexity: {
                total: totalComplexity,
                average: Math.round(avgComplexity * 10) / 10,
                highest: highestFlow
                    ? { flow: highestFlow.flowName, value: highestFlow.complexity }
                    : undefined,
                rating: this.getComplexityRating(avgComplexity),
            },
            maintainability: {
                technicalDebtMinutes: debtMinutes,
                technicalDebt: this.formatDuration(debtMinutes),
                debtRatio: Math.round(debtRatio * 10) / 10,
                rating: this.getMaintainabilityRating(debtRatio),
            },
            reliability: {
                bugs,
                rating: this.getReliabilityRating(bugs),
            },
            security: {
                vulnerabilities,
                hotspots,
                rating: this.getSecurityRating(vulnerabilities),
            },
        };
    }

    /**
     * Classify issues into bugs, vulnerabilities, code smells, and hotspots
     * Uses the issueType metadata from rule definitions for accurate classification
     */
    private static classifyIssues(report: LintReport): {
        bugs: number;
        vulnerabilities: number;
        codeSmells: number;
        hotspots: number;
    } {
        let bugs = 0;
        let vulnerabilities = 0;
        let codeSmells = 0;
        let hotspots = 0;

        for (const file of report.files) {
            for (const issue of file.issues) {
                const issueType = getIssueTypeForRule(issue.ruleId);

                switch (issueType) {
                    case 'bug':
                        bugs++;
                        break;
                    case 'vulnerability':
                        vulnerabilities++;
                        break;
                    case 'code-smell':
                    default:
                        codeSmells++;
                        break;
                }
            }
        }

        return { bugs, vulnerabilities, codeSmells, hotspots };
    }
}
