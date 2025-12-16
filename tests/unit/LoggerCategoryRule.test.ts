import { LoggerCategoryRule } from '../../src/rules/logging/LoggerCategoryRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('LoggerCategoryRule', () => {
    const rule = new LoggerCategoryRule();

    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: {
            enabled: true,
            options: {},
        },
    });

    describe('validate', () => {
        it('should pass for logger with category', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger message="test" category="com.myorg.test"/>
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
                        <logger message="test"/>
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

        it('should report multiple loggers without category', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger message="first"/>
                        <logger message="second"/>
                        <logger message="third" category="com.myorg.test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(2);
        });
    });

    describe('rule properties', () => {
        it('should have correct id', () => {
            expect(rule.id).toBe('MULE-006');
        });

        it('should have correct severity', () => {
            expect(rule.severity).toBe('warning');
        });

        it('should have correct category', () => {
            expect(rule.category).toBe('logging');
        });
    });
});
