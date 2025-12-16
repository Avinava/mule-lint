import { HardcodedCredentialsRule } from '../../src/rules/security/HardcodedCredentialsRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('HardcodedCredentialsRule', () => {
    const rule = new HardcodedCredentialsRule();

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
        it('should pass for secure property placeholder', () => {
            const xml = `
                <mule xmlns:sfdc="http://www.mulesoft.org/schema/mule/salesforce">
                    <sfdc:config name="Salesforce_Config">
                        <sfdc:basic-connection password="\${secure::sfdc.password}" />
                    </sfdc:config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for regular property placeholder', () => {
            const xml = `
                <mule xmlns:sfdc="http://www.mulesoft.org/schema/mule/salesforce">
                    <sfdc:config name="Salesforce_Config">
                        <sfdc:basic-connection password="\${sfdc.password}" />
                    </sfdc:config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });
        
        it('should pass for DataWeave expression', () => {
            const xml = `
                <mule xmlns:sfdc="http://www.mulesoft.org/schema/mule/salesforce">
                    <sfdc:config name="Salesforce_Config">
                        <sfdc:basic-connection password="#[vars.password]" />
                    </sfdc:config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for hardcoded password', () => {
            const xml = `
                <mule xmlns:sfdc="http://www.mulesoft.org/schema/mule/salesforce">
                    <sfdc:config name="Salesforce_Config">
                        <sfdc:basic-connection password="mySecretPassword123" />
                    </sfdc:config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-201');
        });
        
        it('should ignore empty or boolean values', () => {
            const xml = `
                <mule xmlns:sfdc="http://www.mulesoft.org/schema/mule/salesforce">
                    <sfdc:config name="Salesforce_Config">
                        <sfdc:basic-connection password="" />
                        <sfdc:basic-connection password="true" />
                    </sfdc:config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);
            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });
    });
});
