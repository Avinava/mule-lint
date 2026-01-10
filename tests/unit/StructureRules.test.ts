import { MonolithicXmlRule } from '../../src/rules/structure/StructureRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Structure Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-804: Monolithic XML File
    // =================================================================
    describe('MonolithicXmlRule (MULE-804)', () => {
        const rule = new MonolithicXmlRule();

        it('should pass for file with few flows', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="flow-1"><logger/></flow>
                    <flow name="flow-2"><logger/></flow>
                    <sub-flow name="sub-1"><logger/></sub-flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for file with many flows', () => {
            const flows = Array.from({ length: 12 }, (_, i) =>
                `<flow name="flow-${i + 1}"><logger/></flow>`
            ).join('\n');

            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    ${flows}
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-804');
            expect(issues[0].message).toContain('12 flows');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-804');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('structure');
        });
    });
});
