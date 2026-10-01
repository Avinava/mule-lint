import { InputValidationRule } from '../../src/rules/security/InputValidationRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

const context: ValidationContext = {
  filePath: 'app.xml',
  relativePath: 'src/main/mule/app.xml',
  projectRoot: '/project',
  config: { enabled: true },
};

function run(body: string) {
  const xml = `
    <mule xmlns="http://www.mulesoft.org/schema/mule/core"
          xmlns:http="http://www.mulesoft.org/schema/mule/http"
          xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"
          xmlns:validation="http://www.mulesoft.org/schema/mule/validation"
          xmlns:json="http://www.mulesoft.org/schema/mule/json"
          xmlns:apikit="http://www.mulesoft.org/schema/mule/mule-apikit">
      ${body}
    </mule>`;
  const result = parseXml(xml, 'app.xml');
  return new InputValidationRule().validate(result.document!, context);
}

describe('InputValidationRule (SEC-004)', () => {
  it('reports a body-accepting listener flow without validation', () => {
    const issues = run(`
      <flow name="create-order">
        <http:listener config-ref="L" path="/orders" allowedMethods="POST"/>
        <logger/>
      </flow>`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('create-order');
  });

  it('treats a listener without allowedMethods as body-accepting', () => {
    expect(run(`<flow name="f"><http:listener config-ref="L" path="/x"/></flow>`)).toHaveLength(1);
  });

  it('ignores GET-only listeners', () => {
    expect(
      run(`<flow name="f"><http:listener config-ref="L" path="/x" allowedMethods="GET"/></flow>`),
    ).toHaveLength(0);
  });

  it('accepts validation module, JSON schema, and DataWeave validation', () => {
    for (const step of [
      '<validation:is-not-null value="#[payload]"/>',
      '<json:validate-schema schema="s.json"/>',
      '<ee:transform><ee:message><ee:set-payload>validateOrder(payload)</ee:set-payload></ee:message></ee:transform>',
    ]) {
      expect(
        run(`<flow name="f"><http:listener config-ref="L" path="/x"/>${step}</flow>`),
      ).toHaveLength(0);
    }
  });

  it('does not treat unrelated DataWeave `match` as validation', () => {
    const issues = run(`
      <flow name="f"><http:listener config-ref="L" path="/x"/>
        <ee:transform><ee:message><ee:set-payload>payload match { case 1 -> 2 }</ee:set-payload></ee:message></ee:transform>
      </flow>`);
    expect(issues).toHaveLength(1);
  });

  it('skips APIKit-routed flows and flows that delegate with flow-ref', () => {
    expect(
      run(
        `<flow name="main"><http:listener config-ref="L" path="/api/*"/><apikit:router config-ref="A"/></flow>`,
      ),
    ).toHaveLength(0);
    expect(
      run(`<flow name="f"><http:listener config-ref="L" path="/x"/><flow-ref name="v"/></flow>`),
    ).toHaveLength(0);
  });

  it('ignores flows with non-HTTP sources', () => {
    expect(run(`<flow name="f"><logger/></flow>`)).toHaveLength(0);
  });
});
