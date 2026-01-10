import { ExternalDwlRule, DwlNamingRule, DwlModulesRule } from '../../src/rules/dataweave/DataWeaveRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('DataWeave Rules', () => {
    const createContext = (filePath = 'src/main/mule/test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // DW-001: External DWL for Complex Transforms
    // =================================================================
    describe('ExternalDwlRule (DW-001)', () => {
        const rule = new ExternalDwlRule();

        it('should pass for small inline transforms', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <ee:transform doc:name="Small Transform">
                            <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{id: payload.id}
]]></ee:set-payload>
                        </ee:transform>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for large inline transforms', () => {
            // Generate a transform with more than 10 lines
            const bigTransform = `%dw 2.0
output application/json
var line1 = "test"
var line2 = "test"
var line3 = "test"
var line4 = "test"
var line5 = "test"
var line6 = "test"
var line7 = "test"
var line8 = "test"
var line9 = "test"
var line10 = "test"
var line11 = "test"
---
{result: line1}`;

            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <ee:transform doc:name="Big Transform">
                            <ee:set-payload><![CDATA[${bigTransform}]]></ee:set-payload>
                        </ee:transform>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('DW-001');
            expect(issues[0].message).toContain('externalize');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('DW-001');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('dataweave');
        });
    });

    // =================================================================
    // DW-002: DWL File Naming Convention
    // =================================================================
    describe('DwlNamingRule (DW-002)', () => {
        const rule = new DwlNamingRule();

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('DW-002');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('dataweave');
        });

        it('should have configurable convention support', () => {
            expect(rule.description).toContain('kebab-case');
        });
    });

    // =================================================================
    // DW-003: DWL Modules Usage
    // =================================================================
    describe('DwlModulesRule (DW-003)', () => {
        const rule = new DwlModulesRule();

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('DW-003');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('dataweave');
        });
    });
});
