import { HttpUserAgentRule } from '../../src/rules/http/HttpUserAgentRule';
import { HttpTimeoutRule } from '../../src/rules/http/HttpTimeoutRule';
import { HttpContentTypeRule } from '../../src/rules/http/HttpContentTypeRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('HTTP Rules', () => {
  const createContext = (filePath = 'test.xml'): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot: '/project',
    config: { enabled: true },
  });

  // =================================================================
  // MULE-401: HTTP User-Agent
  // =================================================================
  describe('HttpUserAgentRule (MULE-401)', () => {
    const rule = new HttpUserAgentRule();

    it('should pass when User-Agent header is present', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="GET" doc:name="API Call">
                            <http:headers>
                                <http:header headerName="User-Agent" value="MyApp/1.0"/>
                            </http:headers>
                        </http:request>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should report when User-Agent header is missing', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="GET" doc:name="API Call"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-401');
      expect(issues[0].severity).toBe('info');
    });

    it('should have info severity (not warning)', () => {
      expect(rule.severity).toBe('info');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-401');
      expect(rule.category).toBe('http');
    });
  });

  // =================================================================
  // MULE-403: HTTP Timeout
  // =================================================================
  describe('HttpTimeoutRule (MULE-403)', () => {
    const rule = new HttpTimeoutRule();

    it('should pass when responseTimeout is configured', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="HTTP_Config" responseTimeout="30000">
                        <http:request-connection host="api.example.com"/>
                    </http:request-config>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail when responseTimeout is missing', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="HTTP_Config">
                        <http:request-connection host="api.example.com"/>
                    </http:request-config>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-403');
      expect(issues[0].message).toContain('responseTimeout');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-403');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('http');
    });
  });

  // =================================================================
  // MULE-402: HTTP Content-Type
  // =================================================================
  describe('HttpContentTypeRule (MULE-402)', () => {
    const rule = new HttpContentTypeRule();

    it('should pass for POST request with static Content-Type header (pattern A)', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="POST" doc:name="POST Data">
                            <http:headers>
                                <http:header headerName="Content-Type" value="application/json"/>
                            </http:headers>
                        </http:request>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for POST request with Content-Type in CDATA DataWeave block (pattern B)', () => {
      // This is the XSD-correct pattern for setting headers via a DataWeave expression.
      // The linter previously raised a hard error on this valid pattern.
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="POST" doc:name="POST to SAPI">
                            <http:headers><![CDATA[#[output application/java
---
{
    "Content-Type":       "application/json",
    "x-correlation-id":  vars.correlationId default ""
}]]]></http:headers>
                        </http:request>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass for POST request with Content-Type in inline DW value attribute (pattern C)', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="POST" doc:name="POST Data">
                            <http:headers value='#[{"Content-Type": "application/json", "x-corr": vars.corrId}]'/>
                        </http:request>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should downgrade to info when headers are set via DW expression but Content-Type is not visible', () => {
      // When headers are set via DataWeave expression without Content-Type visible in the
      // static text, we cannot definitively say it is missing. Downgrade to info.
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="POST" doc:name="POST Data">
                            <http:headers value='#[vars.headers]'/>
                        </http:request>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-402');
      expect(issues[0].severity).toBe('info');
      expect(issues[0].message).toContain('DataWeave expression');
    });

    it('should fail for POST request without any Content-Type header', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="POST" doc:name="POST Data"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-402');
      expect(issues[0].severity).toBe('warning');
    });

    it('should pass for GET request without Content-Type', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <flow name="test-flow">
                        <http:request method="GET" doc:name="GET Data"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-402');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('http');
    });
  });
});
