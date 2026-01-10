import { FlowCasingRule } from '../../src/rules/naming/FlowCasingRule';
import { VariableNamingRule } from '../../src/rules/naming/VariableNamingRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Naming Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-101: Flow Name Casing
    // =================================================================
    describe('FlowCasingRule (MULE-101)', () => {
        const rule = new FlowCasingRule();

        it('should pass for kebab-case flow names', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-orders-flow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for PascalCase flow names', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="MyOrdersFlow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-101');
            expect(issues[0].message).toContain('kebab-case');
        });

        it('should skip APIKit auto-generated flows', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="get:\\orders:api-config">
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

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-101');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('naming');
        });
    });

    // =================================================================
    // MULE-102: Variable Naming Convention
    // =================================================================
    describe('VariableNamingRule (MULE-102)', () => {
        const rule = new VariableNamingRule();

        it('should pass for camelCase variable names', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <set-variable variableName="orderId" value="123"/>
                        <set-variable variableName="customerName" value="John"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for snake_case variable names', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <set-variable variableName="order_id" value="123"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-102');
            expect(issues[0].message).toContain('camelCase');
        });

        it('should fail for kebab-case variable names', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <set-variable variableName="order-id" value="123"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-102');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('naming');
        });
    });
});
