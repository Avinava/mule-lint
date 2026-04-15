import { DOMParser } from '@xmldom/xmldom';
import { ReconnectionStrategyRule } from '../../src/rules/performance/ReconnectionStrategyRule';
import { AutoDiscoveryRule } from '../../src/rules/standards/AutoDiscoveryRule';
import { HttpPortPlaceholderRule } from '../../src/rules/standards/HttpPortPlaceholderRule';
import { EncryptionKeyInLogsRule } from '../../src/rules/security/EncryptionKeyInLogsRule';
import { ExcessiveLoggersRule } from '../../src/rules/logging/ExcessiveLoggersRule';
import { CronExternalizedRule } from '../../src/rules/standards/CronExternalizedRule';
import { ApiKitValidationRule } from '../../src/rules/standards/ApiKitValidationRule';
import { UnusedFlowRule } from '../../src/rules/operations/UnusedFlowRule';
import { DisplayNameRule } from '../../src/rules/documentation/DisplayNameRule';

const parser = new DOMParser();

const createContext = () => ({
  filePath: 'test.xml',
  relativePath: 'test.xml',
  projectRoot: '/test',
  config: { enabled: true, options: {} },
  allFiles: [],
  yamlFiles: {},
});

describe('Operations & Resilience Rules', () => {
  describe('ReconnectionStrategyRule (RES-001)', () => {
    const rule = new ReconnectionStrategyRule();

    it('should detect HTTP request config without reconnection', () => {
      const xml = `
                <mule>
                    <http:request-config name="test-config" basePath="/api" />
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('RES-001');
      expect(issues[0].message).toContain('no reconnection strategy');
    });

    it('should pass for config with reconnection nested inside http:request-connection (XSD-correct placement)', () => {
      // Per the Mule HTTP connector XSD, <reconnection> must be a child of
      // <http:request-connection>, NOT a direct child of <http:request-config>.
      // Placing it directly under <http:request-config> causes a SAXParseException.
      const xml = `
                <mule>
                    <http:request-config name="HTTPS_Global_Request_Config" basePath="/api">
                        <http:request-connection
                            host="\${https.request.host}"
                            port="\${https.request.port}"
                            maxConnections="10">
                            <reconnection>
                                <reconnect count="3" frequency="2000"/>
                            </reconnection>
                        </http:request-connection>
                    </http:request-config>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should pass for config with reconnect element (old-style direct child)', () => {
      const xml = `
                <mule>
                    <http:request-config name="test-config" basePath="/api">
                        <http:request-connection>
                            <reconnection>
                                <reconnect frequency="3000" count="3"/>
                            </reconnection>
                        </http:request-connection>
                    </http:request-config>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should pass for config with reconnect-forever strategy', () => {
      const xml = `
                <mule>
                    <http:request-config name="test-config" basePath="/api">
                        <http:request-connection host="api.example.com">
                            <reconnection>
                                <reconnect-forever frequency="2000"/>
                            </reconnection>
                        </http:request-connection>
                    </http:request-config>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('RES-001');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('performance');
    });
  });

  describe('AutoDiscoveryRule (OPS-001)', () => {
    const rule = new AutoDiscoveryRule();

    it('should pass for non-API projects', () => {
      const xml = `
                <mule>
                    <flow name="batch-flow">
                        <batch:job/>
                    </flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should detect missing auto-discovery for API', () => {
      const xml = `
                <mule>
                    <apikit:router config="router-config"/>
                    <flow name="api-main"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('OPS-001');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('OPS-001');
      expect(rule.severity).toBe('info');
    });
  });

  describe('HttpPortPlaceholderRule (OPS-002)', () => {
    const rule = new HttpPortPlaceholderRule();

    it('should detect hardcoded port', () => {
      const xml = `
                <mule>
                    <http:listener-config name="HTTP_Listener" port="8081"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('hardcoded port');
    });

    it('should pass for placeholder port', () => {
      const xml = `
                <mule>
                    <http:listener-config name="HTTP_Listener" port="\${http.port}"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('OPS-002');
      expect(rule.severity).toBe('warning');
    });
  });

  describe('EncryptionKeyInLogsRule (SEC-006)', () => {
    const rule = new EncryptionKeyInLogsRule();

    it('should detect sensitive data in logger message', () => {
      const xml = `
                <mule>
                    <logger message="Encryption key: #[vars.encryptionKey]"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('SEC-006');
    });

    it('should detect password in log', () => {
      const xml = `
                <mule>
                    <logger message="User password is #[vars.userPassword]"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
    });

    it('should pass for safe log messages', () => {
      const xml = `
                <mule>
                    <logger message="Processing order #[vars.orderId]"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('SEC-006');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('security');
    });
  });

  describe('ExcessiveLoggersRule (HYG-001)', () => {
    const rule = new ExcessiveLoggersRule();

    it('should detect excessive loggers in flow', () => {
      const xml = `
                <mule>
                    <flow name="test-flow">
                        <logger message="1"/>
                        <logger message="2"/>
                        <logger message="3"/>
                        <logger message="4"/>
                        <logger message="5"/>
                        <logger message="6"/>
                    </flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('6 loggers');
    });

    it('should pass for flow with few loggers', () => {
      const xml = `
                <mule>
                    <flow name="test-flow">
                        <logger message="Start"/>
                        <logger message="End"/>
                    </flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('HYG-001');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('logging');
    });
  });

  describe('CronExternalizedRule (OPS-003)', () => {
    const rule = new CronExternalizedRule();

    it('should detect hardcoded cron expression', () => {
      const xml = `
                <mule>
                    <scheduler:cron expression="0 0 * * * ?"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('Hardcoded cron');
    });

    it('should pass for externalized cron expression', () => {
      const xml = `
                <mule>
                    <scheduler:cron expression="\${scheduler.cron.expression}"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('OPS-003');
      expect(rule.severity).toBe('warning');
    });
  });

  describe('ApiKitValidationRule (API-005)', () => {
    const rule = new ApiKitValidationRule();

    it('should pass for non-API projects', () => {
      const xml = `
                <mule>
                    <flow name="batch-flow">
                        <batch:job/>
                    </flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('API-005');
      expect(rule.severity).toBe('info');
    });
  });

  describe('UnusedFlowRule (HYG-003)', () => {
    const rule = new UnusedFlowRule();

    it('should detect unreferenced sub-flow', () => {
      const xml = `
                <mule>
                    <sub-flow name="unused-subflow">
                        <logger message="test"/>
                    </sub-flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('never referenced');
    });

    it('should pass for referenced sub-flow', () => {
      const xml = `
                <mule>
                    <flow name="main-flow">
                        <http:listener config-ref="HTTP"/>
                        <flow-ref name="my-subflow"/>
                    </flow>
                    <sub-flow name="my-subflow">
                        <logger message="test"/>
                    </sub-flow>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('HYG-003');
      expect(rule.severity).toBe('warning');
    });

    it('should pass for sub-flow that is referenced in another file (via allFlowRefs)', () => {
      // sub-flow only present in this file, but referenced in another file
      const xml = `
        <mule>
          <sub-flow name="my-helper-subflow">
            <logger message="test"/>
          </sub-flow>
        </mule>
      `;
      const doc = parser.parseFromString(xml, 'text/xml');
      // Simulate allFlowRefs populated by LintEngine pre-scan
      const allFlowRefs = new Set(['my-helper-subflow']);
      const issues = rule.validate(doc, { ...createContext(), allFlowRefs });
      expect(issues).toHaveLength(0);
    });

    it('should still flag sub-flow unreferenced cross-file when not in allFlowRefs', () => {
      const xml = `
        <mule>
          <sub-flow name="orphan-subflow">
            <logger message="test"/>
          </sub-flow>
        </mule>
      `;
      const doc = parser.parseFromString(xml, 'text/xml');
      // allFlowRefs does NOT contain orphan-subflow
      const allFlowRefs = new Set(['some-other-flow']);
      const issues = rule.validate(doc, { ...createContext(), allFlowRefs });
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('never referenced');
    });

    it('should skip APIKit-generated flows (verb:\\path:config pattern)', () => {
      const xml = `
        <mule>
          <flow name="get:\\salesforce:api-config">
            <logger message="get salesforce"/>
          </flow>
          <flow name="post:\\orders:api-config">
            <logger message="post orders"/>
          </flow>
          <flow name="delete:\\customers\\(id):api-config">
            <logger message="delete customer"/>
          </flow>
        </mule>
      `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip flows with Salesforce replay-channel-listener', () => {
      const xml = `
        <mule>
          <flow name="sf-order-event-listener">
            <salesforce:replay-channel-listener channel="/event/OrderEvent__e" config-ref="sf-config"/>
            <logger message="received event"/>
          </flow>
        </mule>
      `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip flows with Salesforce subscribe-channel-listener', () => {
      const xml = `
        <mule>
          <flow name="sf-cdc-listener">
            <salesforce:subscribe-channel-listener channel="/data/ChangeEvents" config-ref="sf-config"/>
            <logger message="received CDC event"/>
          </flow>
        </mule>
      `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  describe('DisplayNameRule (DOC-001)', () => {
    const rule = new DisplayNameRule();

    it('should detect generic Set Payload name', () => {
      const xml = `
                <mule>
                    <set-payload doc:name="Set Payload" value="#[payload]"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('generic name');
    });

    it('should pass for descriptive name', () => {
      const xml = `
                <mule>
                    <set-payload doc:name="Build API Response" value="#[payload]"/>
                </mule>
            `;
      const doc = parser.parseFromString(xml, 'text/xml');
      const issues = rule.validate(doc, createContext());
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('DOC-001');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('documentation');
    });
  });
});
