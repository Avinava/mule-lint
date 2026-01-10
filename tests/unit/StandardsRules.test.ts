import { ChoiceAntiPatternRule } from '../../src/rules/standards/ChoiceAntiPatternRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Standards Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-008: Choice Anti-Pattern
    // =================================================================
    describe('ChoiceAntiPatternRule (MULE-008)', () => {
        const rule = new ChoiceAntiPatternRule();

        it('should pass for normal choice blocks', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <choice>
                            <when expression="#[payload.type == 'A']">
                                <logger message="Type A"/>
                            </when>
                            <otherwise>
                                <logger message="Other type"/>
                            </otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for raise-error in otherwise block', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <choice>
                            <when expression="#[payload.type == 'A']">
                                <logger message="Type A"/>
                            </when>
                            <otherwise>
                                <raise-error type="APP:INVALID_TYPE"/>
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
            expect(issues[0].message).toContain('anti-pattern');
        });

        it('should skip raise-error inside until-successful (valid retry pattern)', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <until-successful maxRetries="3">
                            <choice>
                                <when expression="#[payload.success]">
                                    <logger message="Success"/>
                                </when>
                                <otherwise>
                                    <raise-error type="RETRY:FAILED"/>
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

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-008');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('standards');
        });
    });
});
