import { FlowNamingRule } from '../../src/rules/naming/FlowNamingRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext, RuleConfig } from '../../src/types';

describe('FlowNamingRule', () => {
    const rule = new FlowNamingRule();

    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: {
            enabled: true,
            options: {
                flowSuffix: '-flow',
                subflowSuffix: '-subflow',
                excludePatterns: ['*-api-main'],
            },
        },
    });

    describe('validate', () => {
        it('should pass for correctly named flow', () => {
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
            expect(issues).toHaveLength(0);
        });

        it('should fail for incorrectly named flow', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="myProcess">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-002');
            expect(issues[0].message).toContain('myProcess');
            expect(issues[0].message).toContain('-flow');
        });

        it('should pass for correctly named sub-flow', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <sub-flow name="transform-data-subflow">
                        <logger message="test"/>
                    </sub-flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for incorrectly named sub-flow', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <sub-flow name="transformData">
                        <logger message="test"/>
                    </sub-flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-002');
            expect(issues[0].message).toContain('transformData');
            expect(issues[0].message).toContain('-subflow');
        });

        it('should skip excluded patterns', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="orders-api-main">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should report multiple issues', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="getOrders">
                        <logger message="test"/>
                    </flow>
                    <flow name="postOrders">
                        <logger message="test"/>
                    </flow>
                    <sub-flow name="transform">
                        <logger message="test"/>
                    </sub-flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(3);
        });
    });

    describe('rule properties', () => {
        it('should have correct id', () => {
            expect(rule.id).toBe('MULE-002');
        });

        it('should have correct severity', () => {
            expect(rule.severity).toBe('warning');
        });

        it('should have correct category', () => {
            expect(rule.category).toBe('naming');
        });
    });
});
