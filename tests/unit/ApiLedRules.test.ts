import { ExperienceLayerRule, ProcessLayerRule, SystemLayerRule } from '../../src/rules/api-led/ApiLedRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('API-Led Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // API-001: Experience Layer Pattern
    // =================================================================
    describe('ExperienceLayerRule (API-001)', () => {
        const rule = new ExperienceLayerRule();

        it('should pass for experience API with listener', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="orders-exp-get-flow">
                        <http:listener config-ref="HTTPS"/>
                        <flow-ref name="process-orders"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for non-experience flows without listener', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="internal-process-flow">
                        <flow-ref name="process"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-001');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });

    // =================================================================
    // API-002: Process Layer Pattern
    // =================================================================
    describe('ProcessLayerRule (API-002)', () => {
        const rule = new ProcessLayerRule();

        it('should pass for process layer with flow-ref', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="orders-proc-aggregate-flow">
                        <flow-ref name="orders-sys-get"/>
                        <flow-ref name="customers-sys-get"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for process layer with HTTP request', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="orders-process-flow">
                        <http:request config-ref="Orders_API"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-002');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });

    // =================================================================
    // API-003: System Layer Pattern
    // =================================================================
    describe('SystemLayerRule (API-003)', () => {
        const rule = new SystemLayerRule();

        it('should pass for system layer with database', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:db="http://www.mulesoft.org/schema/mule/db">
                    <flow name="orders-sys-get-flow">
                        <db:select config-ref="Database">
                            <db:sql>SELECT * FROM orders</db:sql>
                        </db:select>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for system layer with HTTP request', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="salesforce-system-flow">
                        <http:request config-ref="Salesforce_API"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-003');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });
});
