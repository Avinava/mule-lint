import { MissingErrorHandlerRule } from '../../src/rules/error-handling/MissingErrorHandlerRule';
import { GenericErrorRule } from '../../src/rules/error-handling/GenericErrorRule';
import { HttpStatusRule } from '../../src/rules/error-handling/HttpStatusRule';
import { CorrelationIdRule } from '../../src/rules/error-handling/CorrelationIdRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Error Handling Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-003: Missing Error Handler
    // =================================================================
    describe('MissingErrorHandlerRule (MULE-003)', () => {
        const rule = new MissingErrorHandlerRule();

        it('should pass for flow with inline error handler', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-process-flow">
                        <logger message="test"/>
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for flow without error handler', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-process-flow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-003');
            expect(issues[0].message).toContain('my-process-flow');
        });

        it('should skip APIKit auto-generated flows', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="get:\\health:api-config">
                        <logger message="test"/>
                    </flow>
                    <flow name="post:\\orders:api-config">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should skip *-api-main flows', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="orders-api-main">
                        <apikit:router/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-003');
            expect(rule.severity).toBe('error');
            expect(rule.category).toBe('error-handling');
        });
    });

    // =================================================================
    // MULE-009: Generic Error Type
    // =================================================================
    describe('GenericErrorRule (MULE-009)', () => {
        const rule = new GenericErrorRule();

        it('should pass for specific error types', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue type="HTTP:CONNECTIVITY">
                                <logger message="error"/>
                            </on-error-continue>
                            <on-error-propagate type="VALIDATION:INVALID_JSON">
                                <logger message="error"/>
                            </on-error-propagate>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for type="ANY" in on-error-continue', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue type="ANY">
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-009');
            expect(issues[0].message).toContain('ANY');
        });

        it('should fail for type="MULE:ANY" in on-error-propagate', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-propagate type="MULE:ANY">
                                <logger message="error"/>
                            </on-error-propagate>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('MULE:ANY');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-009');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('error-handling');
        });
    });

    // =================================================================
    // MULE-005: HTTP Status in Error Handler
    // =================================================================
    describe('HttpStatusRule (MULE-005)', () => {
        const rule = new HttpStatusRule();

        it('should pass when httpStatus variable is set', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <set-variable variableName="httpStatus" value="500"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail when httpStatus is not set in error handler', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-005');
            expect(issues[0].message).toContain('httpStatus');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-005');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('error-handling');
        });
    });

    // =================================================================
    // MULE-007: Correlation ID in Error Handler
    // =================================================================
    describe('CorrelationIdRule (MULE-007)', () => {
        const rule = new CorrelationIdRule();

        it('should pass when correlationId is referenced', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <ee:transform>
                                    <ee:set-payload><![CDATA[%dw 2.0
                                    output application/json
                                    ---
                                    {correlationId: correlationId}
                                    ]]></ee:set-payload>
                                </ee:transform>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail when correlationId is not referenced', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-007');
            expect(issues[0].message).toContain('correlationId');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-007');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('error-handling');
        });
    });
});
