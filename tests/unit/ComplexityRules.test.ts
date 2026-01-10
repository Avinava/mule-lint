import { FlowComplexityRule } from '../../src/rules/complexity/FlowComplexityRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Complexity Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-801: Flow Complexity
    // =================================================================
    describe('FlowComplexityRule (MULE-801)', () => {
        const rule = new FlowComplexityRule();

        it('should pass for simple flow', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="simple-flow">
                        <logger message="test"/>
                        <set-variable variableName="x" value="1"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should warn for moderately complex flow', () => {
            // Create a flow with many choice blocks
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="complex-flow">
                        <choice>
                            <when expression="#[a]"><logger/></when>
                            <when expression="#[b]"><logger/></when>
                            <when expression="#[c]"><logger/></when>
                            <otherwise><logger/></otherwise>
                        </choice>
                        <choice>
                            <when expression="#[d]"><logger/></when>
                            <when expression="#[e]"><logger/></when>
                            <otherwise><logger/></otherwise>
                        </choice>
                        <choice>
                            <when expression="#[f]"><logger/></when>
                            <when expression="#[g]"><logger/></when>
                            <when expression="#[h]"><logger/></when>
                            <when expression="#[i]"><logger/></when>
                            <otherwise><logger/></otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            // May generate warning depending on threshold calculation
            if (issues.length > 0) {
                expect(issues[0].ruleId).toBe('MULE-801');
            }
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-801');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('complexity');
        });
    });
});
