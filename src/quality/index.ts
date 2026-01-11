/**
 * Quality Scoring Module
 * Centralized quality rating system for mule-lint
 *
 * This module provides:
 * - Type definitions for quality ratings
 * - Threshold configuration (single source of truth)
 * - Calculation utilities
 */

// Types
export type {
    RatingGrade,
    QualityDimension,
    RatingThreshold,
    RatingResult,
    QualityMetrics,
    QualityRatings,
} from './types';

// Thresholds
export { THRESHOLDS, getThresholds, getDimensions } from './thresholds';

// Calculator
export {
    calculateGrade,
    calculateRating,
    calculateAllRatings,
    calculateDebtMinutes,
    estimateDevelopmentMinutes,
    calculateDebtRatio,
    formatTechDebt,
    formatValue,
    getThresholdForValue,
} from './calculator';
