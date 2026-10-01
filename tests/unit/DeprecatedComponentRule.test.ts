import { DeprecatedComponentRule } from '../../src/rules/standards/DeprecatedComponentRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

const context: ValidationContext = {
  filePath: 'app.xml',
  relativePath: 'src/main/mule/app.xml',
  projectRoot: '/project',
  config: { enabled: true },
};

function run(body: string) {
  const xml = `<mule xmlns="http://www.mulesoft.org/schema/mule/core"
    xmlns:other="http://example.invalid/other">${body}</mule>`;
  return new DeprecatedComponentRule().validate(parseXml(xml, 'app.xml').document!, context);
}

describe('DeprecatedComponentRule (MULE-701)', () => {
  it.each(['component', 'transactional', 'poll', 'inbound-endpoint', 'outbound-endpoint'])(
    'reports deprecated element %s',
    (element) => {
      const issues = run(`<flow name="f"><${element}/></flow>`);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('MULE-701');
      expect(issues[0]?.message).toContain(`"${element}"`);
      expect(issues[0]?.suggestion).toContain('instead');
    },
  );

  it('reports every occurrence', () => {
    expect(run('<flow name="f"><poll/><poll/><component/></flow>')).toHaveLength(3);
  });

  it('accepts modern components', () => {
    expect(
      run('<flow name="f"><scheduler/><logger message="x"/><flow-ref name="g"/></flow>'),
    ).toHaveLength(0);
  });

  it('only matches elements in the core namespace', () => {
    expect(run('<flow name="f"><other:poll/></flow>')).toHaveLength(0);
  });
});
