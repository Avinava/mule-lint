/**
 * Quality Rating Calculator
 * Centralized calculation logic for all quality dimensions
 */

import { RatingGrade, QualityDimension, RatingResult, QualityMetrics, QualityRatings } from './types';
import { THRESHOLDS } from './thresholds';

/**
 * Calculate rating grade from a numeric value
 */
export function calculateGrade(dimension: QualityDimension, value: number): RatingGrade {
    const thresholds = THRESHOLDS[dimension];
    for (const t of thresholds) {
        if (value < t.maxValue) {
            return t.grade;
        }
    }
    return 'E';
}

/**
 * Get the threshold definition for a calculated grade
 */
export function getThresholdForValue(dimension: QualityDimension, value: number) {
    const thresholds = THRESHOLDS[dimension];
    for (const t of thresholds) {
        if (value < t.maxValue) {
            return t;
        }
    }
    return thresholds[thresholds.length - 1];
}

/**
 * Format a numeric value for display based on dimension
 */
export function formatValue(dimension: QualityDimension, value: number): string {
    switch (dimension) {
        case 'complexity':
            return `Avg: ${value.toFixed(1)}`;
        case 'maintainability':
            return `${value.toFixed(1)}%`;
        case 'reliability':
            return `${value} bug${value !== 1 ? 's' : ''}`;
        case 'security':
            return `${value} vuln${value !== 1 ? 's' : ''}`;
        default:
            return `${value}`;
    }
}

/**
 * Calculate full rating result with display values
 */
export function calculateRating(dimension: QualityDimension, value: number): RatingResult {
    const threshold = getThresholdForValue(dimension, value);
    return {
        value,
        grade: threshold.grade,
        label: threshold.label,
        displayValue: formatValue(dimension, value),
    };
}

/**
 * Calculate all quality ratings from metrics
 */
export function calculateAllRatings(metrics: QualityMetrics): QualityRatings {
    const ratings: QualityRatings = {};

    if (metrics.avgComplexity !== undefined) {
        ratings.complexity = calculateRating('complexity', metrics.avgComplexity);
    }

    if (metrics.debtRatio !== undefined) {
        ratings.maintainability = calculateRating('maintainability', metrics.debtRatio);
    }

    if (metrics.bugCount !== undefined) {
        ratings.reliability = calculateRating('reliability', metrics.bugCount);
    }

    if (metrics.vulnerabilityCount !== undefined) {
        ratings.security = calculateRating('security', metrics.vulnerabilityCount);
    }

    return ratings;
}

/**
 * Calculate technical debt in minutes
 * Based on SonarQube-style debt calculation
 */
export function calculateDebtMinutes(codeSmells: number, bugs: number, vulnerabilities: number): number {
    const CODE_SMELL_MINUTES = 5;
    const BUG_MINUTES = 15;
    const VULNERABILITY_MINUTES = 30;

    return codeSmells * CODE_SMELL_MINUTES + bugs * BUG_MINUTES + vulnerabilities * VULNERABILITY_MINUTES;
}

/**
 * Calculate development time estimate in minutes
 * Based on flow and subflow counts
 */
export function estimateDevelopmentMinutes(flowCount: number, subFlowCount: number): number {
    const FLOW_MINUTES = 10;
    const SUBFLOW_MINUTES = 5;
    const MIN_ESTIMATE = 60;

    return Math.max(MIN_ESTIMATE, flowCount * FLOW_MINUTES + subFlowCount * SUBFLOW_MINUTES);
}

/**
 * Calculate debt ratio as percentage
 */
export function calculateDebtRatio(debtMinutes: number, devMinutes: number): number {
    if (devMinutes === 0) return 0;
    return (debtMinutes / devMinutes) * 100;
}

/**
 * Format minutes as human-readable tech debt string
 */
export function formatTechDebt(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 8) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
