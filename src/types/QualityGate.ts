/**
 * Quality Gate types and interfaces
 * Quality Gates provide pass/fail thresholds for code quality metrics
 */

/**
 * Metrics that can be evaluated in quality gate conditions
 */
export type QualityMetric =
    | 'errors'
    | 'warnings'
    | 'infos'
    | 'complexity_max'
    | 'complexity_avg'
    | 'coverage'
    | 'duplications'
    | 'security_hotspots'
    | 'technical_debt_ratio';

/**
 * Comparison operators for quality gate conditions
 */
export type QualityOperator = '<' | '>' | '<=' | '>=' | '=';

/**
 * Result status of a quality gate evaluation
 */
export type QualityGateStatus = 'passed' | 'failed' | 'warning';

/**
 * A single condition within a quality gate
 */
export interface QualityCondition {
    /** The metric to evaluate */
    metric: QualityMetric;
    /** Comparison operator */
    operator: QualityOperator;
    /** Threshold value */
    threshold: number;
    /** Status to assign when condition is violated */
    status: 'fail' | 'warn';
    /** Optional: Apply only to new/changed code */
    onNewCode?: boolean;
}

/**
 * A quality gate definition containing multiple conditions
 */
export interface QualityGate {
    /** Name of the quality gate (e.g., "Mule Way", "Strict") */
    name: string;
    /** List of conditions to evaluate */
    conditions: QualityCondition[];
}

/**
 * Result of evaluating a single condition
 */
export interface ConditionResult {
    /** The condition that was evaluated */
    condition: QualityCondition;
    /** Actual value of the metric */
    actualValue: number;
    /** Whether the condition passed */
    passed: boolean;
}

/**
 * Result of evaluating an entire quality gate
 */
export interface QualityGateResult {
    /** The quality gate that was evaluated */
    gate: QualityGate;
    /** Overall status */
    status: QualityGateStatus;
    /** Individual condition results */
    conditions: ConditionResult[];
    /** Summary message */
    message: string;
}

/**
 * Default quality gate with reasonable thresholds
 */
export const DEFAULT_QUALITY_GATE: QualityGate = {
    name: 'Default',
    conditions: [
        { metric: 'errors', operator: '>', threshold: 0, status: 'fail' },
        { metric: 'warnings', operator: '>', threshold: 10, status: 'warn' },
        { metric: 'complexity_max', operator: '>', threshold: 20, status: 'fail' },
        { metric: 'security_hotspots', operator: '>', threshold: 0, status: 'warn' },
    ],
};

/**
 * Strict quality gate for high-quality requirements
 */
export const STRICT_QUALITY_GATE: QualityGate = {
    name: 'Strict',
    conditions: [
        { metric: 'errors', operator: '>', threshold: 0, status: 'fail' },
        { metric: 'warnings', operator: '>', threshold: 0, status: 'fail' },
        { metric: 'complexity_max', operator: '>', threshold: 10, status: 'fail' },
        { metric: 'security_hotspots', operator: '>', threshold: 0, status: 'fail' },
    ],
};
