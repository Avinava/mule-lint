/**
 * Quality Scoring Types
 * Core interfaces for the extensible quality rating system
 */

/**
 * Rating grades (A-E scale)
 */
export type RatingGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Quality dimensions - extensible for future metrics
 */
export type QualityDimension =
    | 'complexity'
    | 'maintainability'
    | 'reliability'
    | 'security';

/**
 * Threshold definition for a single rating grade
 */
export interface RatingThreshold {
    /** The rating grade */
    grade: RatingGrade;
    /** Upper bound value (exclusive) - values below this get this grade */
    maxValue: number;
    /** Short label (e.g., "Excellent", "High Risk") */
    label: string;
    /** Full description for UI display */
    description: string;
    /** CSS variable or hex color */
    color: string;
}

/**
 * Result of a rating calculation
 */
export interface RatingResult {
    /** The raw numeric value */
    value: number;
    /** Calculated grade */
    grade: RatingGrade;
    /** Human-readable label */
    label: string;
    /** Formatted display value (e.g., "15.2%", "Avg: 8") */
    displayValue: string;
}

/**
 * Quality metrics input for calculations
 */
export interface QualityMetrics {
    /** Average flow complexity score */
    avgComplexity?: number;
    /** Technical debt ratio as percentage */
    debtRatio?: number;
    /** Number of bug-type issues */
    bugCount?: number;
    /** Number of security vulnerabilities */
    vulnerabilityCount?: number;
    /** Number of security hotspots */
    hotspotCount?: number;
}

/**
 * Complete quality ratings for a project
 */
export interface QualityRatings {
    complexity?: RatingResult;
    maintainability?: RatingResult;
    reliability?: RatingResult;
    security?: RatingResult;
}
