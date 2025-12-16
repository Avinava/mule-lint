import { ChoiceAntiPatternRule } from '../../src/rules/standards/ChoiceAntiPatternRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('ChoiceAntiPatternRule', () => {
    const rule = new ChoiceAntiPatternRule();

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
        it('should fail for raise-error in otherwise block', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="testFlow">
                        <choice>
                            <when expression="#[payload != null]">
                                <logger/>
                            </when>
                            <otherwise>
                                <raise-error type="APP:TEST_ERROR"/>
                            </otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-008');
        });

        it('should pass for raise-error in until-successful (retry pattern)', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="testFlow">
                        <until-successful>
                            <choice>
                                <when expression="#[vars.status == 'COMPLETED']">
                                    <logger/>
                                </when>
                                <otherwise>
                                    <raise-error type="APP:RETRY_NEEDED"/>
                                </otherwise>
                            </choice>
                        </until-successful>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });
        
        it('should fail for generic ANY type in when block', () => {
             const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="testFlow">
                        <choice>
                            <when expression="#[payload != null]">
                                <raise-error type="ANY"/>
                            </when>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('generic type="ANY"');
        });
    });
});
