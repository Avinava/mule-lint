import { ErrorHandlerTypeCoverageRule } from '../../src/rules/error-handling/ErrorHandlerTypeCoverageRule';
import { ErrorResponseStructureRule } from '../../src/rules/error-handling/ErrorResponseStructureRule';
import { CatchAllLastRule } from '../../src/rules/error-handling/CatchAllLastRule';
import { ListenerReconnectForeverRule } from '../../src/rules/performance/ListenerReconnectForeverRule';
import { ConfigPropertiesOrderingRule } from '../../src/rules/standards/ConfigPropertiesOrderingRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('P1 Error Handling & Resilience Rules', () => {
  const createContext = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
    filePath: 'test.xml',
    relativePath: 'test.xml',
    projectRoot: '/project',
    config: { enabled: true },
    ...overrides,
  });

  // =================================================================
  // ERR-002: Error Handler Type Coverage
  // =================================================================
  describe('ErrorHandlerTypeCoverageRule (ERR-002)', () => {
    const rule = new ErrorHandlerTypeCoverageRule();

    it('should pass when all APIKit error types are covered', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="global-error-handler">
            <on-error-propagate type="APIKIT:BAD_REQUEST">
              <logger message="400"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:NOT_FOUND">
              <logger message="404"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:METHOD_NOT_ALLOWED">
              <logger message="405"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:NOT_ACCEPTABLE">
              <logger message="406"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:UNSUPPORTED_MEDIA_TYPE">
              <logger message="415"/>
            </on-error-propagate>
            <on-error-propagate type="ANY">
              <logger message="500"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const ctx = createContext({
        projectContext: { hasHttpListener: true, hasApikitRouter: true },
      });
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(0);
    });

    it('should flag missing APIKit error types', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="incomplete-handler">
            <on-error-propagate type="APIKIT:BAD_REQUEST">
              <logger message="400"/>
            </on-error-propagate>
            <on-error-propagate type="ANY">
              <logger message="500"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const ctx = createContext({
        projectContext: { hasHttpListener: true, hasApikitRouter: true },
      });
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('ERR-002');
      expect(issues[0].message).toContain('APIKIT:NOT_FOUND');
      expect(issues[0].message).toContain('APIKIT:METHOD_NOT_ALLOWED');
    });

    it('should skip when project has no APIKit router', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="batch-handler">
            <on-error-propagate type="ANY">
              <logger message="error"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const ctx = createContext({
        projectContext: { hasHttpListener: false, hasApikitRouter: false },
      });
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(0);
    });

    it('should only check named (global) error handlers', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate type="ANY">
                <logger message="error"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const ctx = createContext({
        projectContext: { hasHttpListener: true, hasApikitRouter: true },
      });
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(0);
    });

    it('should handle comma-separated error types', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="global-error-handler">
            <on-error-propagate type="APIKIT:BAD_REQUEST, APIKIT:NOT_FOUND">
              <logger message="400/404"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:METHOD_NOT_ALLOWED, APIKIT:NOT_ACCEPTABLE, APIKIT:UNSUPPORTED_MEDIA_TYPE">
              <logger message="405/406/415"/>
            </on-error-propagate>
            <on-error-propagate type="ANY">
              <logger message="500"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const ctx = createContext({
        projectContext: { hasHttpListener: true, hasApikitRouter: true },
      });
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('ERR-002');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // ERR-003: Error Response Structure
  // =================================================================
  describe('ErrorResponseStructureRule (ERR-003)', () => {
    const rule = new ErrorResponseStructureRule();

    it('should pass when error response has both correlationId and message', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate>
                <ee:transform>
                  <ee:message>
                    <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    correlationId: vars.correlationId default "",
    error: "BadRequest",
    message: error.detailedDescription default ""
}]]></ee:set-payload>
                  </ee:message>
                </ee:transform>
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

    it('should flag missing correlationId in error response', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate>
                <ee:transform>
                  <ee:message>
                    <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    error: "BadRequest",
    message: error.detailedDescription default ""
}]]></ee:set-payload>
                  </ee:message>
                </ee:transform>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('ERR-003');
      expect(issues[0].message).toContain('correlationId');
    });

    it('should flag missing both correlationId and message', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate>
                <ee:transform>
                  <ee:message>
                    <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    statusCode: 500,
    error: "InternalError"
}]]></ee:set-payload>
                  </ee:message>
                </ee:transform>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('both correlationId and message');
    });

    it('should skip error blocks without ee:set-payload', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-continue>
                <logger message="error logged"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip external DWL resources', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate>
                <ee:transform>
                  <ee:message>
                    <ee:set-payload resource="dwl/error-response.dwl"/>
                  </ee:message>
                </ee:transform>
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

    it('should accept detailedDescription as a message equivalent', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-propagate>
                <ee:transform>
                  <ee:message>
                    <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    correlationId: vars.correlationId,
    description: error.detailedDescription
}]]></ee:set-payload>
                  </ee:message>
                </ee:transform>
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

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('ERR-003');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // ERR-004: Catch-All Must Be Last
  // =================================================================
  describe('CatchAllLastRule (ERR-004)', () => {
    const rule = new CatchAllLastRule();

    it('should pass when type="ANY" is the last handler', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="global-handler">
            <on-error-propagate type="APIKIT:BAD_REQUEST">
              <logger message="400"/>
            </on-error-propagate>
            <on-error-propagate type="HTTP:CONNECTIVITY">
              <logger message="502"/>
            </on-error-propagate>
            <on-error-propagate type="ANY">
              <logger message="500"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag type="ANY" when not last', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="bad-handler">
            <on-error-propagate type="ANY">
              <logger message="catch all first"/>
            </on-error-propagate>
            <on-error-propagate type="HTTP:CONNECTIVITY">
              <logger message="unreachable"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('ERR-004');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('unreachable');
    });

    it('should flag implicit catch-all (no type attribute) when not last', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-continue>
                <logger message="catch all"/>
              </on-error-continue>
              <on-error-propagate type="HTTP:BAD_REQUEST">
                <logger message="unreachable"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('unreachable');
    });

    it('should pass with a single error handler block', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="test-flow">
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

    it('should flag MULE:ANY when not last', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <error-handler name="handler">
            <on-error-propagate type="MULE:ANY">
              <logger message="catch all"/>
            </on-error-propagate>
            <on-error-propagate type="APIKIT:NOT_FOUND">
              <logger message="unreachable"/>
            </on-error-propagate>
          </error-handler>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('MULE:ANY');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('ERR-004');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // RES-002: Listener Reconnect-Forever
  // =================================================================
  describe('ListenerReconnectForeverRule (RES-002)', () => {
    const rule = new ListenerReconnectForeverRule();

    it('should pass when listener-config has reconnect-forever', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:listener-config name="httpListenerConfig">
            <http:listener-connection host="0.0.0.0" port="\${http.port}">
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

    it('should flag listener-config with bounded reconnect', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:listener-config name="httpListenerConfig">
            <http:listener-connection host="0.0.0.0" port="\${http.port}">
              <reconnection>
                <reconnect count="3" frequency="2000"/>
              </reconnection>
            </http:listener-connection>
          </http:listener-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('RES-002');
      expect(issues[0].message).toContain('bounded reconnect');
    });

    it('should flag listener-config with no reconnection strategy', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:listener-config name="httpListenerConfig">
            <http:listener-connection host="0.0.0.0" port="\${http.port}"/>
          </http:listener-config>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('RES-002');
      expect(issues[0].message).toContain('no reconnection strategy');
    });

    it('should not flag non-listener configs (e.g., request-config)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:http="http://www.mulesoft.org/schema/mule/http">
          <http:request-config name="httpRequestConfig">
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

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('RES-002');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('performance');
    });
  });

  // =================================================================
  // CFG-001: Configuration Properties Ordering
  // =================================================================
  describe('ConfigPropertiesOrderingRule (CFG-001)', () => {
    const rule = new ConfigPropertiesOrderingRule();

    it('should pass when global is loaded before env-specific', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <configuration-properties file="config/global.yaml"/>
          <configuration-properties file="config/\${mule.env}.yaml"/>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag when env-specific is loaded before global', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <configuration-properties file="config/\${mule.env}.yaml"/>
          <configuration-properties file="config/global.yaml"/>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CFG-001');
      expect(issues[0].message).toContain('before global defaults');
    });

    it('should pass with a single configuration-properties element', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <configuration-properties file="config/global.yaml"/>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when no env-specific properties are present', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <configuration-properties file="config/global.yaml"/>
          <configuration-properties file="entity-config/account.yaml"/>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should recognize ${env} as env-specific pattern', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <configuration-properties file="config/\${env}.yaml"/>
          <configuration-properties file="config/global.yaml"/>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('CFG-001');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('standards');
    });
  });
});
