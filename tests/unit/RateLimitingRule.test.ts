import { RateLimitingRule } from '../../src/rules/security/RateLimitingRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

function run(body: string, relativePath = 'src/main/mule/api.xml') {
  const xml = `<mule xmlns="http://www.mulesoft.org/schema/mule/core" xmlns:http="http://www.mulesoft.org/schema/mule/http" xmlns:throttling="http://www.mulesoft.org/schema/mule/throttling">${body}</mule>`;
  const context: ValidationContext = {
    filePath: relativePath,
    relativePath,
    projectRoot: '/project',
    config: { enabled: true },
  };
  return new RateLimitingRule().validate(parseXml(xml, 'api.xml').document!, context);
}

const listener = '<flow name="f"><http:listener config-ref="L" path="/x"/></flow>';

describe('RateLimitingRule (SEC-003)', () => {
  it('reports an API listener without rate limiting', () => {
    const issues = run(listener);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('SEC-003');
  });

  it('accepts a prefixed throttling module element', () => {
    expect(run(`${listener}<throttling:config name="t"/>`)).toHaveLength(0);
  });

  it('does not mistake unrelated names containing "rate" for rate limiting', () => {
    expect(run(`${listener}<iterate-items name="i"/>`)).toHaveLength(1);
  });

  it('reports only once per file for multiple listeners', () => {
    const issues = run(
      `${listener}<flow name="g"><http:listener config-ref="L" path="/y"/></flow>`,
    );
    expect(issues).toHaveLength(1);
  });

  it('accepts elements whose local name contains throttl/rate', () => {
    expect(run(`${listener}<throttling-policy name="t"/>`)).toHaveLength(0);
    expect(run(`${listener}<rate-limit name="r"/>`)).toHaveLength(0);
  });

  it('accepts policy elements', () => {
    expect(run(`${listener}<policy name="p"/>`)).toHaveLength(0);
  });

  it('ignores files without listeners', () => {
    expect(run('<flow name="f"><logger/></flow>')).toHaveLength(0);
  });

  it('ignores files whose path is not interface/api related', () => {
    expect(run(listener, 'src/main/mule/orders.xml')).toHaveLength(0);
  });

  it('checks files with interface in the path', () => {
    expect(run(listener, 'src/main/mule/orders-interface.xml')).toHaveLength(1);
  });
});
