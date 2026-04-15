import { TryScopeRule } from '../../src/rules/error-handling/TryScopeRule';
import { ReconnectionStrategyRule } from '../../src/rules/performance/ReconnectionStrategyRule';
import { HardcodedCredentialsRule } from '../../src/rules/security/HardcodedCredentialsRule';
import { GenericErrorRule } from '../../src/rules/error-handling/GenericErrorRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Existing Rule Enhancements (Phase 2e)', () => {
  const createContext = (filePath = 'test.xml', projectRoot = '/project'): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot,
    config: { enabled: true },
  });

  // =================================================================
  // ERR-001: TryScopeRule enhancements
  // =================================================================
  describe('TryScopeRule (ERR-001) — sub-flow + WSC enhancements', () => {
    const rule = new TryScopeRule();

    it('should flag sub-flow with http:request but no Try scope', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <sub-flow name="call-backend-subflow">
            <http:request config-ref="HTTP_Request_Config" method="GET" path="/api/data"/>
          </sub-flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('ERR-001');
      expect(issues[0].message).toContain('Sub-flow');
      expect(issues[0].message).toContain('call-backend-subflow');
      expect(issues[0].message).toContain('http:request');
    });

    it('should pass for sub-flow with http:request wrapped in Try scope', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <sub-flow name="call-backend-subflow">
            <try>
              <http:request config-ref="HTTP_Request_Config" method="GET" path="/api/data"/>
              <error-handler>
                <on-error-propagate type="HTTP:CONNECTIVITY">
                  <logger message="failed"/>
                </on-error-propagate>
              </error-handler>
            </try>
          </sub-flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for sub-flow without http:request', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <sub-flow name="transform-subflow">
            <set-variable variableName="x" value="1"/>
            <logger message="done"/>
          </sub-flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should count WSC consume operations as risky', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http"
              xmlns:wsc="http://www.mulesoft.org/schema/mule/wsc">
          <flow name="multi-call-flow">
            <http:request config-ref="HTTP" method="GET" path="/api"/>
            <wsc:consume config-ref="WSC" operation="getOrder"/>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      // 2 risky ops (http:request + wsc:consume), no Try scope
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('2 external calls');
    });

    it('should pass for flow with risky ops inside Try scope', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http"
              xmlns:db="http://www.mulesoft.org/schema/mule/db">
          <flow name="safe-flow">
            <try>
              <http:request config-ref="HTTP" method="GET" path="/api"/>
              <db:select config-ref="DB">
                <db:sql>SELECT 1</db:sql>
              </db:select>
            </try>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // RES-001: ReconnectionStrategyRule enhancements
  // =================================================================
  describe('ReconnectionStrategyRule (RES-001) — listener vs request differentiation', () => {
    const rule = new ReconnectionStrategyRule();

    it('should flag listener-config without reconnection and suggest reconnect-forever', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:listener-config name="HTTP_Listener_Config">
            <http:listener-connection host="0.0.0.0" port="8081"/>
          </http:listener-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('RES-001');
      expect(issues[0].message).toContain('HTTP Listener');
      expect(issues[0].suggestion).toContain('reconnect-forever');
    });

    it('should flag request-config without reconnection and suggest bounded reconnect', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:request-config name="HTTP_Request_Config">
            <http:request-connection host="api.example.com" port="443"/>
          </http:request-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('RES-001');
      expect(issues[0].message).toContain('HTTP Request');
      expect(issues[0].suggestion).toContain('count=');
    });

    it('should pass for listener-config with reconnect-forever', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:listener-config name="HTTP_Listener_Config">
            <http:listener-connection host="0.0.0.0" port="8081">
              <reconnection>
                <reconnect-forever frequency="5000"/>
              </reconnection>
            </http:listener-connection>
          </http:listener-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for request-config with bounded reconnect', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:request-config name="HTTP_Request_Config">
            <http:request-connection host="api.example.com" port="443">
              <reconnection>
                <reconnect count="3" frequency="2000"/>
              </reconnection>
            </http:request-connection>
          </http:request-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag Salesforce config without reconnection', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <salesforce:sfdc-config name="Salesforce_Config">
            <salesforce:basic-connection username="\${sfdc.user}" password="\${secure::sfdc.password}"/>
          </salesforce:sfdc-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Salesforce');
    });

    it('should pass for Salesforce config with reconnection', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <salesforce:sfdc-config name="Salesforce_Config">
            <salesforce:basic-connection username="\${sfdc.user}" password="\${secure::sfdc.password}">
              <reconnection>
                <reconnect count="3" frequency="2000"/>
              </reconnection>
            </salesforce:basic-connection>
          </salesforce:sfdc-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag DB config without reconnection', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:db="http://www.mulesoft.org/schema/mule/db">
          <db:config name="Database_Config">
            <db:my-sql-connection host="localhost" port="3306" database="mydb"/>
          </db:config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Database');
    });

    it('should flag multiple connector types without reconnection', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http"
              xmlns:jms="http://www.mulesoft.org/schema/mule/jms">
          <http:listener-config name="HTTP_Listener">
            <http:listener-connection host="0.0.0.0" port="8081"/>
          </http:listener-config>
          <http:request-config name="HTTP_Request">
            <http:request-connection host="api.example.com" port="443"/>
          </http:request-config>
          <jms:jms-config name="JMS_Config">
            <jms:active-mq-connection/>
          </jms:jms-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(3);
    });
  });

  // =================================================================
  // MULE-201: HardcodedCredentialsRule enhancements
  // =================================================================
  describe('HardcodedCredentialsRule (MULE-201) — expanded sensitive attrs', () => {
    const rule = new HardcodedCredentialsRule();

    it('should flag hardcoded consumerKey', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <salesforce:sfdc-config name="SF_Config">
            <salesforce:oauth-jwt-connection consumerKey="3MVG9abc123xyz"/>
          </salesforce:sfdc-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-201');
      expect(issues[0].message).toContain('consumerKey');
    });

    it('should flag hardcoded consumerSecret', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <netsuite:config name="NS_Config">
            <netsuite:token-auth-connection consumerSecret="abc123secret"/>
          </netsuite:config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('consumerSecret');
    });

    it('should flag hardcoded storePassword', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
          <tls:context name="TLS_Context">
            <tls:key-store path="keystore.jks" storePassword="changeit"/>
          </tls:context>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('storePassword');
    });

    it('should flag hardcoded tokenId and tokenSecret', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <netsuite:config name="NS_Config">
            <netsuite:token-auth-connection tokenId="TID_abc123" tokenSecret="TSEC_xyz789"/>
          </netsuite:config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should flag hardcoded keyPassword and keystorePassword', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
          <tls:context name="TLS_Context">
            <tls:key-store keyPassword="myKeyPass" keystorePassword="myStorePass"/>
          </tls:context>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(2);
    });

    it('should pass for secure placeholder on all new sensitive attrs', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <netsuite:config name="NS_Config">
            <netsuite:token-auth-connection
              consumerKey="\${secure::ns.consumerKey}"
              consumerSecret="\${secure::ns.consumerSecret}"
              tokenId="\${secure::ns.tokenId}"
              tokenSecret="\${secure::ns.tokenSecret}"
              tokenKey="\${secure::ns.tokenKey}"/>
          </netsuite:config>
          <tls:context name="TLS">
            <tls:key-store
              storePassword="\${secure::tls.storePassword}"
              keyPassword="\${secure::tls.keyPassword}"
              keystorePassword="\${secure::tls.keystorePassword}"/>
          </tls:context>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag hardcoded tokenKey for NetSuite OAuth', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <netsuite:config name="NS_Config">
            <netsuite:token-auth-connection tokenKey="TKEY_hardcoded"/>
          </netsuite:config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('tokenKey');
    });
  });

  // =================================================================
  // MULE-009: GenericErrorRule enhancements
  // =================================================================
  describe('GenericErrorRule (MULE-009) — catch-all position awareness', () => {
    const rule = new GenericErrorRule();

    it('should allow type="ANY" as the sole (and thus last) on-error block', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="simple-flow">
            <error-handler>
              <on-error-propagate type="ANY">
                <logger message="catch all"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should allow type="ANY" as the last of multiple on-error blocks', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="multi-handler-flow">
            <error-handler>
              <on-error-continue type="HTTP:CONNECTIVITY">
                <logger message="connectivity"/>
              </on-error-continue>
              <on-error-continue type="VALIDATION:INVALID_JSON">
                <logger message="validation"/>
              </on-error-continue>
              <on-error-propagate type="ANY">
                <set-variable variableName="httpStatus" value="500"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag type="ANY" when it is NOT the last on-error block', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="bad-order-flow">
            <error-handler>
              <on-error-propagate type="ANY">
                <logger message="catch all first - bad!"/>
              </on-error-propagate>
              <on-error-continue type="HTTP:CONNECTIVITY">
                <logger message="this is unreachable"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-009');
      expect(issues[0].message).toContain('not the last');
    });

    it('should flag type="MULE:ANY" in the middle of on-error blocks', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="middle-any-flow">
            <error-handler>
              <on-error-continue type="HTTP:BAD_REQUEST">
                <logger message="400"/>
              </on-error-continue>
              <on-error-propagate type="MULE:ANY">
                <logger message="catch all in middle"/>
              </on-error-propagate>
              <on-error-continue type="HTTP:CONNECTIVITY">
                <logger message="unreachable"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('MULE:ANY');
    });

    it('should handle multiple flows independently', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="good-flow">
            <error-handler>
              <on-error-continue type="HTTP:CONNECTIVITY">
                <logger message="specific"/>
              </on-error-continue>
              <on-error-propagate type="ANY">
                <logger message="catch all last - good"/>
              </on-error-propagate>
            </error-handler>
          </flow>
          <flow name="bad-flow">
            <error-handler>
              <on-error-propagate type="ANY">
                <logger message="catch all first - bad"/>
              </on-error-propagate>
              <on-error-continue type="DB:CONNECTIVITY">
                <logger message="unreachable"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      // Only bad-flow should be flagged
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('not the last');
    });

    it('should still pass for specific error types regardless of position', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="specific-types-flow">
            <error-handler>
              <on-error-continue type="HTTP:CONNECTIVITY">
                <logger message="connectivity"/>
              </on-error-continue>
              <on-error-propagate type="VALIDATION:INVALID_JSON">
                <logger message="validation"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
