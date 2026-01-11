import {
    evaluateQualityGate,
    getQualityGateExitCode,
    formatQualityGateResult,
} from '../../src/core/QualityGateEvaluator';
import {
    QualityGate,
    DEFAULT_QUALITY_GATE,
    STRICT_QUALITY_GATE,
} from '../../src/types/QualityGate';
import { LintReport } from '../../src/types/Report';

describe('QualityGateEvaluator', () => {
    // Helper to create a minimal report
    function createReport(errors: number, warnings: number, infos: number): LintReport {
        return {
            projectRoot: '/test',
            timestamp: new Date().toISOString(),
            durationMs: 100,
            files: [],
            summary: {
                totalFiles: 1,
                filesWithIssues: errors > 0 || warnings > 0 ? 1 : 0,
                parseErrors: 0,
                bySeverity: { error: errors, warning: warnings, info: infos },
                byRule: {},
            },
        };
    }

    describe('evaluateQualityGate', () => {
        it('should pass when no errors', () => {
            const report = createReport(0, 0, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);

            expect(result.status).toBe('passed');
            expect(result.message).toContain('passed');
        });

        it('should fail when errors exceed threshold', () => {
            const report = createReport(5, 0, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);

            expect(result.status).toBe('failed');
            expect(result.message).toContain('FAILED');
            expect(result.conditions[0].passed).toBe(false);
        });

        it('should warn when warnings exceed threshold', () => {
            const report = createReport(0, 15, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);

            expect(result.status).toBe('warning');
            expect(result.conditions[1].passed).toBe(false);
        });

        it('should evaluate all conditions', () => {
            const report = createReport(0, 5, 10);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);

            expect(result.conditions.length).toBe(DEFAULT_QUALITY_GATE.conditions.length);
            result.conditions.forEach(cr => {
                expect(cr).toHaveProperty('condition');
                expect(cr).toHaveProperty('actualValue');
                expect(cr).toHaveProperty('passed');
            });
        });

        it('should use strict gate correctly', () => {
            const report = createReport(0, 1, 0); // Even 1 warning fails strict
            const result = evaluateQualityGate(report, STRICT_QUALITY_GATE);

            expect(result.status).toBe('failed');
        });

        it('should use custom gate', () => {
            const customGate: QualityGate = {
                name: 'Custom',
                conditions: [
                    { metric: 'errors', operator: '>', threshold: 5, status: 'fail' },
                ],
            };
            const report = createReport(3, 0, 0);
            const result = evaluateQualityGate(report, customGate);

            expect(result.status).toBe('passed'); // 3 errors is <= 5 threshold
            expect(result.gate.name).toBe('Custom');
        });
    });

    describe('getQualityGateExitCode', () => {
        it('should return 0 for passed', () => {
            expect(getQualityGateExitCode('passed')).toBe(0);
        });

        it('should return 1 for failed', () => {
            expect(getQualityGateExitCode('failed')).toBe(1);
        });

        it('should return 0 for warning by default', () => {
            expect(getQualityGateExitCode('warning')).toBe(0);
        });

        it('should return 1 for warning when failOnWarning is true', () => {
            expect(getQualityGateExitCode('warning', true)).toBe(1);
        });
    });

    describe('formatQualityGateResult', () => {
        it('should format passed result', () => {
            const report = createReport(0, 0, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);
            const formatted = formatQualityGateResult(result);

            expect(formatted).toContain('Quality Gate: Default');
            expect(formatted).toContain('PASSED');
            expect(formatted).toContain('Conditions:');
        });

        it('should format failed result', () => {
            const report = createReport(5, 0, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);
            const formatted = formatQualityGateResult(result);

            expect(formatted).toContain('FAILED');
            expect(formatted).toContain('errors: 5');
        });

        it('should include condition details', () => {
            const report = createReport(0, 5, 0);
            const result = evaluateQualityGate(report, DEFAULT_QUALITY_GATE);
            const formatted = formatQualityGateResult(result);

            expect(formatted).toContain('threshold:');
        });
    });
});
