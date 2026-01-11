import { LintReport, ProjectMetrics } from '../types/Report';
import { Issue, Severity } from '../types/Rule';

/**
 * Rating type for metrics (SonarQube-style A-E)
 */
export type MetricRating = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Calculates A-E ratings based on metric values
 *
 * These thresholds are inspired by SonarQube but adapted for MuleSoft:
 * - Complexity is measured per flow
 * - Technical debt is measured in minutes
 * - Ratings consider Mule-specific best practices
 */
export class MetricsAggregator {
    /**
     * Calculate complexity rating based on average flow complexity
     * 
     * A: Average complexity ≤ 5
     * B: Average complexity ≤ 10
     * C: Average complexity ≤ 15
     * D: Average complexity ≤ 20
     * E: Average complexity > 20
     */
    static getComplexityRating(avgComplexity: number): MetricRating {
        if (avgComplexity <= 5) return 'A';
        if (avgComplexity <= 10) return 'B';
        if (avgComplexity <= 15) return 'C';
        if (avgComplexity <= 20) return 'D';
        return 'E';
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
     * Debt ratio = (debt in minutes) / (total development minutes estimate)
     *
     * A: Ratio ≤ 5%
     * B: Ratio ≤ 10%
     * C: Ratio ≤ 20%
     * D: Ratio ≤ 50%
     * E: Ratio > 50%
     */
    static getMaintainabilityRating(debtRatioPercent: number): MetricRating {
        if (debtRatioPercent <= 5) return 'A';
        if (debtRatioPercent <= 10) return 'B';
        if (debtRatioPercent <= 20) return 'C';
        if (debtRatioPercent <= 50) return 'D';
        return 'E';
    }

    /**
     * Calculate reliability rating based on bug count
     *
     * A: 0 bugs
     * B: 1-2 bugs
     * C: 3-5 bugs
     * D: 6-10 bugs
     * E: > 10 bugs
     */
    static getReliabilityRating(bugCount: number): MetricRating {
        if (bugCount === 0) return 'A';
        if (bugCount <= 2) return 'B';
        if (bugCount <= 5) return 'C';
        if (bugCount <= 10) return 'D';
        return 'E';
    }

    /**
     * Calculate security rating based on vulnerability count
     *
     * A: 0 vulnerabilities
     * B: 1 vulnerability
     * C: 2-3 vulnerabilities
     * D: 4-5 vulnerabilities
     * E: > 5 vulnerabilities
     */
    static getSecurityRating(vulnerabilityCount: number): MetricRating {
        if (vulnerabilityCount === 0) return 'A';
        if (vulnerabilityCount === 1) return 'B';
        if (vulnerabilityCount <= 3) return 'C';
        if (vulnerabilityCount <= 5) return 'D';
        return 'E';
    }

    /**
     * Format time duration from minutes
     */
    static formatDuration(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${mins}min`;
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
            flowData[0]
        );

        // Classify issues by type for ratings
        const { bugs, vulnerabilities, codeSmells, hotspots } = this.classifyIssues(report);

        // Calculate technical debt (simplified: 5 min per code smell, 15 min per bug, 30 min per vulnerability)
        const debtMinutes = codeSmells * 5 + bugs * 15 + vulnerabilities * 30;

        // Estimate development time (1 min per line of "code" in flows - rough estimate)
        const estimatedDevMinutes = Math.max(metrics.flowCount * 10 + metrics.subFlowCount * 5, 60);
        const debtRatio = (debtMinutes / estimatedDevMinutes) * 100;

        // Build enhanced metrics
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
     * Based on rule categories and severity
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

        // Rule ID patterns for classification
        const bugPatterns = ['MULE-001', 'MULE-003', 'PROJ-001'];
        const vulnPatterns = ['MULE-004', 'MULE-201', 'MULE-202', 'SEC-', 'YAML-004'];
        const hotspotPatterns = ['SEC-003', 'SEC-004', 'RES-'];

        for (const file of report.files) {
            for (const issue of file.issues) {
                const ruleId = issue.ruleId;

                // Check for vulnerabilities first (highest severity)
                if (vulnPatterns.some(p => ruleId.startsWith(p))) {
                    vulnerabilities++;
                }
                // Check for hotspots
                else if (hotspotPatterns.some(p => ruleId.startsWith(p))) {
                    hotspots++;
                }
                // Check for bugs
                else if (bugPatterns.some(p => ruleId.startsWith(p))) {
                    bugs++;
                }
                // Everything else is a code smell
                else {
                    codeSmells++;
                }
            }
        }

        return { bugs, vulnerabilities, codeSmells, hotspots };
    }
}
