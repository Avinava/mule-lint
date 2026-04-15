import { ApikitMainFlowStructureRule } from '../../src/rules/api-led/ApikitMainFlowStructureRule';
import { ApikitStatusCodeVariableRule } from '../../src/rules/api-led/ApikitStatusCodeVariableRule';
import { ApikitConsoleProductionRule } from '../../src/rules/api-led/ApikitConsoleProductionRule';
import { ReplayChannelConfigRule } from '../../src/rules/connector/ReplayChannelConfigRule';
import { ConnectionIdleTimeoutRule } from '../../src/rules/http/ConnectionIdleTimeoutRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('P2 API-Led & Connector Rules', () => {
  const createContext = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
    filePath: 'test.xml',
    relativePath: 'test.xml',
    projectRoot: '/project',
    config: { enabled: true },
    ...overrides,
  });

  // =================================================================
  // API-006: APIKit Main Flow Structure
  // =================================================================
  describe('ApikitMainFlowStructureRule (API-006)', () => {
    const rule = new ApikitMainFlowStructureRule();

    it('should pass when main flow has only listener and router', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-main">
            <http:listener config-ref="httpListenerConfig" path="/api/*" xmlns:http="http://www.mulesoft.org/schema/mule/http"/>
            <apikit:router config-ref="api-config" xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when main flow has listener, router, and error-handler', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-main">
            <http:listener config-ref="httpListenerConfig" path="/api/*" xmlns:http="http://www.mulesoft.org/schema/mule/http"/>
            <apikit:router config-ref="api-config" xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit"/>
            <error-handler ref="global-error-handler"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag main flow with too many operations', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-main">
            <http:listener config-ref="httpListenerConfig" path="/api/*" xmlns:http="http://www.mulesoft.org/schema/mule/http"/>
            <set-variable variableName="foo" value="bar"/>
            <logger message="hello"/>
            <set-variable variableName="baz" value="qux"/>
            <apikit:router config-ref="api-config" xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('API-006');
      expect(issues[0].message).toContain('api-main');
    });

    it('should skip flows without apikit router', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="some-other-flow">
            <logger message="hello"/>
            <set-variable variableName="foo" value="bar"/>
            <set-variable variableName="baz" value="qux"/>
            <set-variable variableName="a" value="b"/>
            <set-variable variableName="c" value="d"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should detect main flows ending in -main suffix', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="rsm-salesforce-sapi-main">
            <http:listener config-ref="httpListenerConfig" path="/api/*" xmlns:http="http://www.mulesoft.org/schema/mule/http"/>
            <apikit:router config-ref="api-config" xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // API-007: APIKit Status Code Variable
  // =================================================================
  describe('ApikitStatusCodeVariableRule (API-007)', () => {
    const rule = new ApikitStatusCodeVariableRule();

    it('should pass when APIKit flow sets httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="200"/>
            <logger message="GET accounts"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag APIKit flow missing httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get:\\accounts:api-config">
            <logger message="GET accounts"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('API-007');
      expect(issues[0].message).toContain('httpStatus');
    });

    it('should flag POST flow and suggest 201', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="post:\\accounts:api-config">
            <logger message="POST accounts"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('201');
    });

    it('should flag DELETE flow and suggest 204', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="delete:\\accounts\\(id):api-config">
            <logger message="DELETE account"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('204');
    });

    it('should skip non-APIKit flows', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="process-accounts-flow">
            <logger message="processing"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when httpStatus is set via ee:set-variable', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="put:\\accounts\\(id):api-config">
            <ee:set-variable variableName="httpStatus">200</ee:set-variable>
            <logger message="PUT account"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // API-008: APIKit Console in Production
  // =================================================================
  describe('ApikitConsoleProductionRule (API-008)', () => {
    const rule = new ApikitConsoleProductionRule();

    it('should flag apikit:console element', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit">
          <flow name="api-console">
            <http:listener config-ref="httpListenerConfig" path="/console/*" xmlns:http="http://www.mulesoft.org/schema/mule/http"/>
            <apikit:console config-ref="api-config"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('API-008');
      expect(issues[0].message).toContain('console');
      // issueType is on the rule class, not on individual issues
      expect(rule.issueType).toBe('vulnerability');
    });

    it('should not flag unrelated console elements', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <logger message="no console here"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag console with router config-ref', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="console-flow">
            <console config-ref="router-config"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('API-008');
    });
  });

  // =================================================================
  // SF-001: Salesforce Replay Channel Config
  // =================================================================
  describe('ReplayChannelConfigRule (SF-001)', () => {
    const rule = new ReplayChannelConfigRule();

    it('should flag subscribe-channel without replay config', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="cdc-listener">
            <salesforce:subscribe-channel streamingChannel="/data/AccountChangeEvent"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"/>
            <logger message="received event"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('SF-001');
      expect(issues[0].message).toContain('AccountChangeEvent');
    });

    it('should pass when replay-channel is used', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="cdc-listener">
            <salesforce:replay-channel streamingChannel="/data/AccountChangeEvent"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"/>
            <logger message="received event"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag subscribe-topic without replay config', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="platform-event-listener">
            <salesforce:subscribe-topic channel="/event/MyPlatformEvent__e"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"/>
            <logger message="received event"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('SF-001');
    });

    it('should pass when no Salesforce streaming elements exist', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="http-flow">
            <logger message="no salesforce here"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when replay-topic is configured alongside subscribe-topic', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="event-listener">
            <salesforce:subscribe-topic channel="/event/Order__e"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"/>
            <salesforce:replay-topic channel="/event/Order__e"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce"/>
            <logger message="received event"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // HTTP-004: Connection Idle Timeout
  // =================================================================
  describe('ConnectionIdleTimeoutRule (HTTP-004)', () => {
    const rule = new ConnectionIdleTimeoutRule();

    it('should flag HTTP request-config without idle timeout or socket props', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <http:request-config name="HTTP_Request_Config"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:request-connection host="0.0.0.0" port="8081"/>
          </http:request-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('HTTP-004');
      expect(issues[0].message).toContain('HTTP_Request_Config');
    });

    it('should pass when connectionIdleTimeout is set', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <http:request-config name="HTTP_Request_Config"
            connectionIdleTimeout="30000"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:request-connection host="0.0.0.0" port="8081"/>
          </http:request-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when tcp-client-socket-properties are configured', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <http:request-config name="HTTP_Request_Config"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:request-connection host="0.0.0.0" port="8081">
              <http:client-socket-properties>
                <sockets:tcp-client-socket-properties connectionTimeout="10000"
                  clientTimeout="30000"
                  xmlns:sockets="http://www.mulesoft.org/schema/mule/sockets"/>
              </http:client-socket-properties>
            </http:request-connection>
          </http:request-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should not flag non-request configs (listener-config)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <http:listener-config name="HTTP_Listener_Config"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:listener-connection host="0.0.0.0" port="8081"/>
          </http:listener-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag multiple request-configs without timeouts', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <http:request-config name="Config_A"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:request-connection host="api-a.example.com" port="443"/>
          </http:request-config>
          <http:request-config name="Config_B"
            xmlns:http="http://www.mulesoft.org/schema/mule/http">
            <http:request-connection host="api-b.example.com" port="443"/>
          </http:request-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(2);
      expect(issues[0].message).toContain('Config_A');
      expect(issues[1].message).toContain('Config_B');
    });
  });
});
