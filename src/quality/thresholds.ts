/**
 * Quality Rating Thresholds
 * Single source of truth for all rating grade boundaries
 */

import { RatingThreshold, QualityDimension } from './types';

/**
 * Rating thresholds for all quality dimensions
 * Each dimension has A-E grades with specific boundaries
 */
export const THRESHOLDS: Record<QualityDimension, RatingThreshold[]> = {
    complexity: [
        {
            grade: 'A',
            maxValue: 5,
            label: 'Simple',
            description: '≤ 5 - Simple, clean code',
            color: 'var(--rating-a)',
        },
        {
            grade: 'B',
            maxValue: 10,
            label: 'Moderate',
            description: '6-10 - Moderate complexity',
            color: 'var(--rating-b)',
        },
        {
            grade: 'C',
            maxValue: 15,
            label: 'Complex',
            description: '11-15 - Complex, needs review',
            color: 'var(--rating-c)',
        },
        {
            grade: 'D',
            maxValue: 20,
            label: 'Very Complex',
            description: '16-20 - Very complex, refactor needed',
            color: 'var(--rating-d)',
        },
        {
            grade: 'E',
            maxValue: Infinity,
            label: 'Unmaintainable',
            description: '> 20 - Unmaintainable',
            color: 'var(--rating-e)',
        },
    ],

    maintainability: [
        {
            grade: 'A',
            maxValue: 5,
            label: 'Excellent',
            description: '≤ 5% - Excellent maintainability',
            color: 'var(--rating-a)',
        },
        {
            grade: 'B',
            maxValue: 10,
            label: 'Good',
            description: '≤ 10% - Good maintainability',
            color: 'var(--rating-b)',
        },
        {
            grade: 'C',
            maxValue: 20,
            label: 'Moderate',
            description: '≤ 20% - Moderate debt',
            color: 'var(--rating-c)',
        },
        {
            grade: 'D',
            maxValue: 50,
            label: 'High Debt',
            description: '≤ 50% - High debt, plan remediation',
            color: 'var(--rating-d)',
        },
        {
            grade: 'E',
            maxValue: Infinity,
            label: 'Critical',
            description: '> 50% - Critical, immediate action',
            color: 'var(--rating-e)',
        },
    ],

    reliability: [
        {
            grade: 'A',
            maxValue: 0,
            label: 'Reliable',
            description: '0 bugs - No reliability issues',
            color: 'var(--rating-a)',
        },
        {
            grade: 'B',
            maxValue: 2,
            label: 'Minor',
            description: '1-2 bugs - Minor concerns',
            color: 'var(--rating-b)',
        },
        {
            grade: 'C',
            maxValue: 5,
            label: 'Moderate',
            description: '3-5 bugs - Moderate risk',
            color: 'var(--rating-c)',
        },
        {
            grade: 'D',
            maxValue: 10,
            label: 'High Risk',
            description: '6-10 bugs - High risk',
            color: 'var(--rating-d)',
        },
        {
            grade: 'E',
            maxValue: Infinity,
            label: 'Critical',
            description: '> 10 bugs - Critical issues',
            color: 'var(--rating-e)',
        },
    ],

    security: [
        {
            grade: 'A',
            maxValue: 0,
            label: 'Secure',
            description: '0 vulns - Secure configuration',
            color: 'var(--rating-a)',
        },
        {
            grade: 'B',
            maxValue: 1,
            label: 'Minor',
            description: '1 vuln - Minor finding',
            color: 'var(--rating-b)',
        },
        {
            grade: 'C',
            maxValue: 3,
            label: 'Review',
            description: '2-3 vulns - Review needed',
            color: 'var(--rating-c)',
        },
        {
            grade: 'D',
            maxValue: 5,
            label: 'Remediate',
            description: '4-5 vulns - Remediation required',
            color: 'var(--rating-d)',
        },
        {
            grade: 'E',
            maxValue: Infinity,
            label: 'Critical',
            description: '> 5 vulns - Critical security issues',
            color: 'var(--rating-e)',
        },
    ],
};

/**
 * Get thresholds for a specific dimension
 */
export function getThresholds(dimension: QualityDimension): RatingThreshold[] {
    return THRESHOLDS[dimension];
}

/**
 * Get all dimension names
 */
export function getDimensions(): QualityDimension[] {
    return Object.keys(THRESHOLDS) as QualityDimension[];
}
