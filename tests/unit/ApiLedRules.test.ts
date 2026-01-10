import {
    ExperienceLayerRule,
    ProcessLayerRule,
    SystemLayerRule,
} from '../../src/rules/api-led/ApiLedRules';
import { SingleSystemSapiRule } from '../../src/rules/api-led/SingleSystemSapiRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('API-Led Rules', () => {
    const createContext = (filePath = 'test.xml', projectRoot = '/project'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot,
        config: { enabled: true },
    });

    // =================================================================
    // API-001: Experience Layer Pattern
    // =================================================================
    describe('ExperienceLayerRule (API-001)', () => {
        const rule = new ExperienceLayerRule();

        it('should pass for experience API with listener', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="orders-exp-get-flow">
                        <http:listener config-ref="HTTPS"/>
                        <flow-ref name="process-orders"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for non-experience flows without listener', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="internal-process-flow">
                        <flow-ref name="process"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-001');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });

    // =================================================================
    // API-002: Process Layer Pattern
    // =================================================================
    describe('ProcessLayerRule (API-002)', () => {
        const rule = new ProcessLayerRule();

        it('should pass for process layer with flow-ref', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="orders-proc-aggregate-flow">
                        <flow-ref name="orders-sys-get"/>
                        <flow-ref name="customers-sys-get"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for process layer with HTTP request', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="orders-process-flow">
                        <http:request config-ref="Orders_API"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-002');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });

    // =================================================================
    // API-003: System Layer Pattern
    // =================================================================
    describe('SystemLayerRule (API-003)', () => {
        const rule = new SystemLayerRule();

        it('should pass for system layer with database', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:db="http://www.mulesoft.org/schema/mule/db">
                    <flow name="orders-sys-get-flow">
                        <db:select config-ref="Database">
                            <db:sql>SELECT * FROM orders</db:sql>
                        </db:select>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for system layer with HTTP request', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="salesforce-system-flow">
                        <http:request config-ref="Salesforce_API"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-003');
            expect(rule.severity).toBe('info');
            expect(rule.category).toBe('api-led');
        });
    });

    // =================================================================
    // API-004: Single System Per SAPI
    // =================================================================
    describe('SingleSystemSapiRule (API-004)', () => {
        let rule: SingleSystemSapiRule;
        let tempDir: string;

        beforeEach(() => {
            rule = new SingleSystemSapiRule();
            rule.reset(); // Reset for each test
        });

        afterEach(() => {
            // Clean up temp directory if created
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        /**
         * Helper to create a temp SAPI project structure
         */
        const createTempSapiProject = (
            projectName: string,
            xmlFiles: Record<string, string>,
        ): string => {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), projectName + '-'));
            const muleDir = path.join(tempDir, 'src', 'main', 'mule');
            fs.mkdirSync(muleDir, { recursive: true });

            for (const [filename, content] of Object.entries(xmlFiles)) {
                fs.writeFileSync(path.join(muleDir, filename), content);
            }

            return tempDir;
        };

        it('should pass for non-SAPI projects', () => {
            // Create a project without -sapi in the name
            const projectRoot = createTempSapiProject('my-process-api', {
                'global.xml': `
                    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                          xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"
                          xmlns:netsuite="http://www.mulesoft.org/schema/mule/netsuite">
                        <salesforce:sfdc-config name="sf-config"/>
                        <netsuite:config name="ns-config"/>
                    </mule>
                `,
            });

            const context = createContext('global.xml', projectRoot);
            const doc = parseXml('<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
            const issues = rule.validate(doc.document!, context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for SAPI with single system connector', () => {
            const projectRoot = createTempSapiProject('orders-sapi', {
                'global.xml': `
                    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                          xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
                        <salesforce:sfdc-config name="salesforce-config"/>
                    </mule>
                `,
            });

            const context = createContext('global.xml', projectRoot);
            const doc = parseXml('<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
            const issues = rule.validate(doc.document!, context);

            expect(issues).toHaveLength(0);
        });

        it('should fail for SAPI with multiple system connectors', () => {
            const projectRoot = createTempSapiProject('external-sapi', {
                'global.xml': `
                    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                          xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"
                          xmlns:netsuite="http://www.mulesoft.org/schema/mule/netsuite">
                        <salesforce:sfdc-config name="salesforce-config"/>
                        <netsuite:config name="netsuite-config"/>
                    </mule>
                `,
            });

            const context = createContext('global.xml', projectRoot);
            const doc = parseXml('<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
            const issues = rule.validate(doc.document!, context);

            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('API-004');
            expect(issues[0].message).toContain('2 backend systems');
            expect(issues[0].message).toContain('NetSuite');
            expect(issues[0].message).toContain('Salesforce');
        });

        it('should treat NetSuite and NetSuite Restlet as same system', () => {
            const projectRoot = createTempSapiProject('netsuite-sapi', {
                'global.xml': `
                    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                          xmlns:netsuite="http://www.mulesoft.org/schema/mule/netsuite"
                          xmlns:netsuite-restlet="http://www.mulesoft.org/schema/mule/netsuite-restlet">
                        <netsuite:config name="netsuite-config"/>
                        <netsuite-restlet:rest-config name="netsuite-restlet-config"/>
                    </mule>
                `,
            });

            const context = createContext('global.xml', projectRoot);
            const doc = parseXml('<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
            const issues = rule.validate(doc.document!, context);

            // Should pass since NetSuite and NetSuite Restlet are the same system
            expect(issues).toHaveLength(0);
        });

        it('should ignore infrastructure connectors', () => {
            const projectRoot = createTempSapiProject('orders-sapi', {
                'global.xml': `
                    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                          xmlns:http="http://www.mulesoft.org/schema/mule/http"
                          xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit"
                          xmlns:json-logger="http://www.mulesoft.org/schema/mule/json-logger"
                          xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
                        <http:listener-config name="http-listener"/>
                        <apikit:config name="apikit-config"/>
                        <salesforce:sfdc-config name="salesforce-config"/>
                    </mule>
                `,
            });

            const context = createContext('global.xml', projectRoot);
            const doc = parseXml('<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
            const issues = rule.validate(doc.document!, context);

            // Should pass since http, apikit, json-logger are infrastructure
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('API-004');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('api-led');
            expect(rule.name).toBe('Single System Per SAPI');
        });
    });
});
