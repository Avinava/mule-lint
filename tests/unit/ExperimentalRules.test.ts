import { FlowRefDepthRule, ConnectorConfigNamingRule } from '../../src/rules/experimental/ExperimentalRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Experimental Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // EXP-001: Flow Reference Depth
    // =================================================================
    describe('FlowRefDepthRule (EXP-001)', () => {
        const rule = new FlowRefDepthRule();

        it('should pass for flow with few flow-refs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="main-flow">
                        <flow-ref name="step-1"/>
                        <flow-ref name="step-2"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for flow with many flow-refs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="complex-flow">
                        <flow-ref name="step-1"/>
                        <flow-ref name="step-2"/>
                        <flow-ref name="step-3"/>
                        <flow-ref name="step-4"/>
                        <flow-ref name="step-5"/>
                        <flow-ref name="step-6"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('EXP-001');
            expect(issues[0].message).toContain('6 flow-refs');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('EXP-001');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('experimental');
        });
    });

    // =================================================================
    // EXP-002: Connector Config Naming
    // =================================================================
    describe('ConnectorConfigNamingRule (EXP-002)', () => {
        const rule = new ConnectorConfigNamingRule();

        it('should pass for properly named configs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="HTTP_Request_Config"/>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for incorrectly named configs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="my-http-config"/>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('EXP-002');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('EXP-002');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('experimental');
        });
    });
});
