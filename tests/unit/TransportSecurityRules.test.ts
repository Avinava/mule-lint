import { HttpsEnforcementRule } from '../../src/rules/security/HttpsEnforcementRule';
import { TlsContextRequiredRule } from '../../src/rules/security/TlsContextRequiredRule';
import { BasicAuthenticationRule } from '../../src/rules/security/BasicAuthenticationRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

const createContext = (options: Record<string, unknown> = {}): ValidationContext => ({
  filePath: 'test.xml',
  relativePath: 'src/main/mule/test.xml',
  projectRoot: '/project',
  config: { enabled: true, options },
});

/** A property placeholder, kept out of template literals so it is not interpolated. */
const PROTOCOL_PLACEHOLDER = '${http.protocol}';
const SECURE_PLACEHOLDER = '${secure::api.password}';

const wrap = (body: string): string => `
  <mule xmlns="http://www.mulesoft.org/schema/mule/core"
        xmlns:http="http://www.mulesoft.org/schema/mule/http"
        xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
    ${body}
  </mule>`;

const run = (
  rule: { validate: (d: Document, c: ValidationContext) => unknown[] },
  xml: string,
  options = {},
) => {
  const result = parseXml(wrap(xml));
  expect(result.success).toBe(true);
  return rule.validate(result.document!, createContext(options));
};

describe('SEC-012 HttpsEnforcementRule', () => {
  const rule = new HttpsEnforcementRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-012');
    expect(rule.severity).toBe('error');
    expect(rule.issueType).toBe('vulnerability');
  });

  it('flags a literal HTTP request connection', () => {
    const issues = run(
      rule,
      `
      <http:request-config name="Orders_API">
        <http:request-connection protocol="HTTP" host="orders.example.com" port="80"/>
      </http:request-config>`,
    );
    expect(issues).toHaveLength(1);
    expect((issues[0] as { message: string }).message).toContain('orders.example.com');
  });

  it('passes HTTPS', () => {
    const issues = run(
      rule,
      `
      <http:request-config name="Orders_API">
        <http:request-connection protocol="HTTPS" host="orders.example.com" port="443"/>
      </http:request-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('treats a dynamic protocol as unknown and passes by default', () => {
    const issues = run(
      rule,
      `
      <http:request-config name="A">
        <http:request-connection protocol="${PROTOCOL_PLACEHOLDER}" host="a.example.com"/>
      </http:request-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('reports an unknown protocol as info when configured to', () => {
    const issues = run(
      rule,
      `
      <http:request-config name="A">
        <http:request-connection protocol="${PROTOCOL_PLACEHOLDER}" host="a.example.com"/>
      </http:request-config>`,
      { reportUnknownProtocol: true },
    );
    expect(issues).toHaveLength(1);
    expect((issues[0] as { severity: string }).severity).toBe('info');
  });

  it('passes loopback hosts by default', () => {
    const issues = run(
      rule,
      `
      <http:request-config name="Local">
        <http:request-connection protocol="HTTP" host="localhost" port="8081"/>
      </http:request-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('does not assume private hosts are safe but honours allowedHttpHosts', () => {
    const xml = `
      <http:request-config name="Internal">
        <http:request-connection protocol="HTTP" host="svc.internal.example.com"/>
      </http:request-config>`;
    expect(run(rule, xml)).toHaveLength(1);
    expect(run(rule, xml, { allowedHttpHosts: ['*.internal.example.com'] })).toHaveLength(0);
  });

  it('flags an absolute http:// request URL', () => {
    const issues = run(
      rule,
      `
      <flow name="f"><http:request url="http://orders.example.com/v1/orders"/></flow>`,
    );
    expect(issues).toHaveLength(1);
    expect((issues[0] as { message: string }).message).toContain('orders.example.com');
  });

  it('ignores a request with no url or protocol', () => {
    const issues = run(rule, `<flow name="f"><http:request config-ref="A" path="/x"/></flow>`);
    expect(issues).toHaveLength(0);
  });

  it('is namespace-prefix independent', () => {
    const xml = `
      <mule xmlns="http://www.mulesoft.org/schema/mule/core"
            xmlns:h="http://www.mulesoft.org/schema/mule/http">
        <h:request-config name="A">
          <h:request-connection protocol="HTTP" host="a.example.com"/>
        </h:request-config>
      </mule>`;
    const result = parseXml(xml);
    expect(rule.validate(result.document!, createContext())).toHaveLength(1);
  });
});

describe('SEC-013 TlsContextRequiredRule', () => {
  const rule = new TlsContextRequiredRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-013');
    expect(rule.severity).toBe('warning');
  });

  it('flags HTTPS with no TLS context', () => {
    const issues = run(
      rule,
      `
      <http:listener-config name="HTTPS_Listener">
        <http:listener-connection protocol="HTTPS" host="0.0.0.0" port="8082"/>
      </http:listener-config>`,
    );
    expect(issues).toHaveLength(1);
    expect((issues[0] as { message: string }).message).toContain('HTTPS_Listener');
  });

  it('passes an inline tls:context', () => {
    const issues = run(
      rule,
      `
      <http:listener-config name="HTTPS_Listener">
        <http:listener-connection protocol="HTTPS" host="0.0.0.0" port="8082">
          <tls:context><tls:trust-store path="t.jks"/></tls:context>
        </http:listener-connection>
      </http:listener-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('passes a named TLS context reference', () => {
    const issues = run(
      rule,
      `
      <http:listener-config name="HTTPS_Listener">
        <http:listener-connection protocol="HTTPS" host="0.0.0.0" tlsContext-ref="Global_TLS"/>
      </http:listener-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('leaves literal HTTP to SEC-012', () => {
    const issues = run(
      rule,
      `
      <http:listener-config name="L">
        <http:listener-connection protocol="HTTP" host="0.0.0.0"/>
      </http:listener-config>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('passes a dynamic protocol unless configured otherwise', () => {
    const xml = `
      <http:listener-config name="L">
        <http:listener-connection protocol="${PROTOCOL_PLACEHOLDER}" host="0.0.0.0"/>
      </http:listener-config>`;
    expect(run(rule, xml)).toHaveLength(0);
    expect(run(rule, xml, { reportUnknownProtocol: true })).toHaveLength(1);
  });

  it('ignores connections with no protocol attribute', () => {
    const issues = run(
      rule,
      `
      <http:listener-config name="L"><http:listener-connection host="0.0.0.0"/></http:listener-config>`,
    );
    expect(issues).toHaveLength(0);
  });
});

describe('SEC-014 BasicAuthenticationRule', () => {
  const rule = new BasicAuthenticationRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-014');
    expect(rule.severity).toBe('warning');
  });

  it('flags basic-authentication regardless of prefix', () => {
    const issues = run(
      rule,
      `
      <flow name="f">
        <http:request config-ref="A">
          <http:authentication>
            <http:basic-authentication username="u" password="${SECURE_PLACEHOLDER}"/>
          </http:authentication>
        </http:request>
      </flow>`,
    );
    expect(issues).toHaveLength(1);
    expect((issues[0] as { message: string }).message).toContain('basic-authentication');
  });

  it('passes an OAuth grant type', () => {
    const issues = run(
      rule,
      `
      <flow name="f">
        <http:request config-ref="A">
          <http:authentication>
            <oauth:client-credentials-grant-type xmlns:oauth="http://www.mulesoft.org/schema/mule/oauth" clientId="a"/>
          </http:authentication>
        </http:request>
      </flow>`,
    );
    expect(issues).toHaveLength(0);
  });

  it('honours allowedConnectors', () => {
    const xml = `
      <http:request-config name="Legacy_API">
        <http:basic-authentication username="u" password="p"/>
      </http:request-config>`;
    expect(run(rule, xml)).toHaveLength(1);
    expect(run(rule, xml, { allowedConnectors: ['Legacy_API'] })).toHaveLength(0);
  });

  it('honours excludePatterns on the file path', () => {
    const xml = `<http:request-config name="A"><http:basic-authentication username="u"/></http:request-config>`;
    expect(run(rule, xml, { excludePatterns: ['*/test.xml'] })).toHaveLength(0);
  });

  it('reports nothing for a document with no authentication', () => {
    expect(run(rule, `<flow name="f"><logger/></flow>`)).toHaveLength(0);
  });
});
