import { LoggerCategoryRule } from '../../src/rules/logging/LoggerCategoryRule';
import { LoggerPayloadRule } from '../../src/rules/logging/LoggerPayloadRule';
import { LoggerInUntilSuccessfulRule } from '../../src/rules/logging/LoggerInUntilSuccessfulRule';
import { StructuredLoggingRule, SensitiveDataLoggingRule } from '../../src/rules/logging/NewLoggingRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Logging Rules', () => {
    const createContext = (filePath = 'src/main/mule/test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-006: Logger Category Required
    // =================================================================
    describe('LoggerCategoryRule (MULE-006)', () => {
        const rule = new LoggerCategoryRule();

        it('should pass for logger with category', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg.orders" message="Processing order"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for logger without category', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger message="Processing order" doc:name="Log Order"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-006');
            expect(issues[0].message).toContain('category');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-006');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('logging');
        });
    });

    // =================================================================
    // MULE-301: Logger Payload Reference
    // =================================================================
    describe('LoggerPayloadRule (MULE-301)', () => {
        const rule = new LoggerPayloadRule();

        it('should pass for logging specific fields', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="#[payload.orderId]"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for logging entire payload', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="#[payload]"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-301');
            expect(issues[0].message).toContain('payload');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-301');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('logging');
        });
    });

    // =================================================================
    // MULE-303: Logger in Until-Successful
    // =================================================================
    describe('LoggerInUntilSuccessfulRule (MULE-303)', () => {
        const rule = new LoggerInUntilSuccessfulRule();

        it('should pass for logger outside until-successful', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="Before retry"/>
                        <until-successful maxRetries="5">
                            <http:request config-ref="HTTP_Config"/>
                        </until-successful>
                        <logger category="com.myorg" message="After retry"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for logger inside until-successful', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <until-successful maxRetries="5">
                            <logger category="com.myorg" message="Attempting..."/>
                            <http:request config-ref="HTTP_Config"/>
                        </until-successful>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-303');
            expect(issues[0].message).toContain('until-successful');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-303');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('logging');
        });
    });

    // =================================================================
    // LOG-004: Sensitive Data Logging
    // =================================================================
    describe('SensitiveDataLoggingRule (LOG-004)', () => {
        const rule = new SensitiveDataLoggingRule();

        it('should pass for non-sensitive logging', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="#['Order ID: ' ++ vars.orderId]"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for logging sensitive variables', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="#['Password: ' ++ vars.password]"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('LOG-004');
            expect(issues[0].severity).toBe('error');
        });

        it('should fail for logging secure property placeholders', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger category="com.myorg" message="API Key: \${secure::api.key}"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('sensitive');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('LOG-004');
            expect(rule.severity).toBe('error');
            expect(rule.category).toBe('logging');
        });
    });
});
