import { AsyncErrorHandlerRule } from '../../src/rules/performance/AsyncErrorHandlerRule';
import { LargeChoiceBlockRule } from '../../src/rules/performance/LargeChoiceBlockRule';
import { ScatterGatherRoutesRule } from '../../src/rules/performance/ScatterGatherRoutesRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Performance Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-502: Async Without Error Handler
    // =================================================================
    describe('AsyncErrorHandlerRule (MULE-502)', () => {
        const rule = new AsyncErrorHandlerRule();

        it('should pass for async with error handler', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <async>
                            <http:request config-ref="HTTP"/>
                            <error-handler>
                                <on-error-continue>
                                    <logger message="error"/>
                                </on-error-continue>
                            </error-handler>
                        </async>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for async with try scope', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <async>
                            <try>
                                <http:request config-ref="HTTP"/>
                            </try>
                        </async>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for async without error handling', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <async doc:name="Process Async">
                            <http:request config-ref="HTTP"/>
                        </async>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-502');
            expect(issues[0].message).toContain('error handling');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-502');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('performance');
        });
    });

    // =================================================================
    // MULE-503: Large Choice Blocks
    // =================================================================
    describe('LargeChoiceBlockRule (MULE-503)', () => {
        const rule = new LargeChoiceBlockRule();

        it('should pass for choice with few when clauses', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <choice>
                            <when expression="#[payload.type == 'A']">
                                <logger message="A"/>
                            </when>
                            <when expression="#[payload.type == 'B']">
                                <logger message="B"/>
                            </when>
                            <otherwise>
                                <logger message="Other"/>
                            </otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for choice with many when clauses', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <choice>
                            <when expression="#[payload.type == '1']"><logger/></when>
                            <when expression="#[payload.type == '2']"><logger/></when>
                            <when expression="#[payload.type == '3']"><logger/></when>
                            <when expression="#[payload.type == '4']"><logger/></when>
                            <when expression="#[payload.type == '5']"><logger/></when>
                            <when expression="#[payload.type == '6']"><logger/></when>
                            <when expression="#[payload.type == '7']"><logger/></when>
                            <when expression="#[payload.type == '8']"><logger/></when>
                            <otherwise><logger/></otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-503');
            expect(issues[0].message).toContain('8 when clauses');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-503');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('performance');
        });
    });

    // =================================================================
    // MULE-501: Scatter-Gather Route Count
    // =================================================================
    describe('ScatterGatherRoutesRule (MULE-501)', () => {
        const rule = new ScatterGatherRoutesRule();

        it('should pass for scatter-gather with few routes', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <scatter-gather>
                            <route><http:request/></route>
                            <route><http:request/></route>
                            <route><http:request/></route>
                        </scatter-gather>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for scatter-gather with many routes', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <scatter-gather>
                            <route><http:request/></route>
                            <route><http:request/></route>
                            <route><http:request/></route>
                            <route><http:request/></route>
                            <route><http:request/></route>
                            <route><http:request/></route>
                        </scatter-gather>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-501');
            expect(issues[0].message).toContain('6 routes');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-501');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('performance');
        });
    });
});
