import { StructuredLoggingRule } from '../../src/rules/logging/LoggingPatternRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

function run(body: string, relativePath = 'src/main/mule/global.xml') {
  const xml = `<mule xmlns="http://www.mulesoft.org/schema/mule/core"
    xmlns:json-logger="http://www.mulesoft.org/schema/mule/json-logger">${body}</mule>`;
  const context: ValidationContext = {
    filePath: relativePath,
    relativePath,
    projectRoot: '/project',
    config: { enabled: true },
  };
  return new StructuredLoggingRule().validate(parseXml(xml, 'global.xml').document!, context);
}

describe('StructuredLoggingRule (LOG-001)', () => {
  it('reports standard loggers without JSON logger in a global file', () => {
    const issues = run('<flow name="f"><logger message="hi"/><logger message="x"/></flow>');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('LOG-001');
  });

  it('also checks config files', () => {
    expect(run('<flow name="f"><logger/></flow>', 'src/main/mule/app-config.xml')).toHaveLength(1);
  });

  it('accepts an element whose local name contains json-logger', () => {
    expect(
      run('<json-logger-config name="jl"/><flow name="f"><logger message="hi"/></flow>'),
    ).toHaveLength(0);
  });

  it('accepts the real JSON Logger module namespace', () => {
    expect(
      run(
        '<json-logger:config name="jl"/><flow name="f"><json-logger:logger message="hi"/><logger message="x"/></flow>',
      ),
    ).toHaveLength(0);
  });

  it('does not report when there are no loggers', () => {
    expect(run('<flow name="f"><set-payload value="x"/></flow>')).toHaveLength(0);
  });

  it('ignores files that are not global or config files', () => {
    expect(run('<flow name="f"><logger/></flow>', 'src/main/mule/orders.xml')).toHaveLength(0);
  });
});
