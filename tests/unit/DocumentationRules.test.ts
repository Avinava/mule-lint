import { FlowDescriptionRule } from '../../src/rules/documentation/FlowDescriptionRule';
import { MissingDocNameRule } from '../../src/rules/documentation/MissingDocNameRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Documentation Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-601: Flow Missing Description
    // =================================================================
    describe('FlowDescriptionRule (MULE-601)', () => {
        const rule = new FlowDescriptionRule();

        it('should pass for flow with description', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:doc="http://www.mulesoft.org/schema/mule/documentation">
                    <flow name="my-flow" doc:description="Processes orders">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for flow without description', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-flow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-601');
            expect(issues[0].message).toContain('description');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-601');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('documentation');
        });
    });

    // =================================================================
    // MULE-604: Missing doc:name
    // =================================================================
    describe('MissingDocNameRule (MULE-604)', () => {
        const rule = new MissingDocNameRule();

        it('should pass for components with doc:name', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:doc="http://www.mulesoft.org/schema/mule/documentation">
                    <flow name="my-flow">
                        <logger message="test" doc:name="Log Message"/>
                        <set-variable variableName="x" value="1" doc:name="Set X"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for logger without doc:name', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-flow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-604');
            expect(issues[0].message).toContain('logger');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-604');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('documentation');
        });
    });
});
