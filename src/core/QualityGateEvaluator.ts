import {
    QualityGate,
    QualityGateResult,
    QualityGateStatus,
    ConditionResult,
    QualityCondition,
    QualityMetric,
    DEFAULT_QUALITY_GATE,
} from '../types/QualityGate';
import { LintReport, LintSummary } from '../types/Report';

/**
 * Extracts metric values from a lint report
 */
function getMetricValue(metric: QualityMetric, report: LintReport): number {
    const summary = report.summary;

    switch (metric) {
        case 'errors':
            return summary.bySeverity.error;
        case 'warnings':
            return summary.bySeverity.warning;
        case 'infos':
            return summary.bySeverity.info;
        case 'complexity_max':
            return report.metrics?.complexity?.highest?.value ?? 0;
        case 'complexity_avg':
            return report.metrics?.complexity?.average ?? 0;
        case 'coverage':
            return report.metrics?.coverage?.percentage ?? 0;
        case 'duplications':
            return report.metrics?.duplications?.percentage ?? 0;
        case 'security_hotspots':
            return report.metrics?.security?.hotspots ?? 0;
        case 'technical_debt_ratio':
            return report.metrics?.maintainability?.debtRatio ?? 0;
        default:
            return 0;
    }
}

/**
 * Evaluates a comparison between actual value and threshold
 */
function evaluateCondition(
    actualValue: number,
    operator: QualityCondition['operator'],
    threshold: number
): boolean {
    switch (operator) {
        case '<':
            return actualValue < threshold;
        case '>':
            return actualValue > threshold;
        case '<=':
            return actualValue <= threshold;
        case '>=':
            return actualValue >= threshold;
        case '=':
            return actualValue === threshold;
        default:
            return false;
    }
}

/**
 * Evaluates a quality gate against a lint report
 */
export function evaluateQualityGate(
    report: LintReport,
    gate: QualityGate = DEFAULT_QUALITY_GATE
): QualityGateResult {
    const conditionResults: ConditionResult[] = [];
    let overallStatus: QualityGateStatus = 'passed';
    const failedConditions: string[] = [];
    const warnConditions: string[] = [];

    for (const condition of gate.conditions) {
        const actualValue = getMetricValue(condition.metric, report);
        const violated = evaluateCondition(actualValue, condition.operator, condition.threshold);

        const result: ConditionResult = {
            condition,
            actualValue,
            passed: !violated,
        };
        conditionResults.push(result);

        if (violated) {
            const conditionStr = `${condition.metric} ${condition.operator} ${condition.threshold} (actual: ${actualValue})`;

            if (condition.status === 'fail') {
                overallStatus = 'failed';
                failedConditions.push(conditionStr);
            } else if (condition.status === 'warn' && overallStatus !== 'failed') {
                overallStatus = 'warning';
                warnConditions.push(conditionStr);
            }
        }
    }

    // Build message
    let message: string;
    if (overallStatus === 'passed') {
        message = `Quality Gate "${gate.name}" passed - all ${gate.conditions.length} conditions met`;
    } else if (overallStatus === 'failed') {
        message = `Quality Gate "${gate.name}" FAILED - ${failedConditions.length} condition(s) violated: ${failedConditions.join(', ')}`;
    } else {
        message = `Quality Gate "${gate.name}" passed with warnings - ${warnConditions.length} warning(s): ${warnConditions.join(', ')}`;
    }

    return {
        gate,
        status: overallStatus,
        conditions: conditionResults,
        message,
    };
}

/**
 * Returns the appropriate exit code based on quality gate status
 */
export function getQualityGateExitCode(status: QualityGateStatus, failOnWarning: boolean = false): number {
    switch (status) {
        case 'passed':
            return 0;
        case 'warning':
            return failOnWarning ? 1 : 0;
        case 'failed':
            return 1;
        default:
            return 0;
    }
}

/**
 * Formats quality gate result for console output
 */
export function formatQualityGateResult(result: QualityGateResult): string {
    const lines: string[] = [];
    const icon = result.status === 'passed' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    const statusColor =
        result.status === 'passed' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';

    lines.push(`\nQuality Gate: ${result.gate.name}`);
    lines.push(`Status: ${icon} ${result.status.toUpperCase()}`);
    lines.push('');

    lines.push('Conditions:');
    for (const cr of result.conditions) {
        const { condition, actualValue, passed } = cr;
        const condIcon = passed ? '✓' : '✗';
        lines.push(
            `  ${condIcon} ${condition.metric}: ${actualValue} (threshold: ${condition.operator} ${condition.threshold})`
        );
    }

    return lines.join('\n');
}
