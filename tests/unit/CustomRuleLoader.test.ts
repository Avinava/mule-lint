import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadCustomXPathRules, CustomRuleError } from '../../src/core/CustomRuleLoader';
import { parseXml } from '../../src/core/XmlParser';
import { XPathHelper } from '../../src/core/XPathHelper';
import { ValidationContext } from '../../src/types';

let dir: string;

const write = (name: string, content: string): string => {
  const target = path.join(dir, name);
  fs.writeFileSync(target, content);
  return target;
};

const context = (): ValidationContext => ({
  filePath: '/project/src/main/mule/a.xml',
  relativePath: 'src/main/mule/a.xml',
  projectRoot: '/project',
  config: { enabled: true },
});

const VALID_FILE = `
rules:
  - id: ACME-001
    name: Standard flow error handler
    description: Organization flows must declare an error handler.
    category: error-handling
    severity: warning
    xpath: //mule:flow[not(mule:error-handler)]
    message: 'Flow "{name}" does not declare an error handler.'
    suggestion: Add an error-handler or an approved global error-handler reference.
`;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-custom-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('loadCustomXPathRules', () => {
  it('loads a valid rule file', () => {
    const rules = loadCustomXPathRules(write('rules.yaml', VALID_FILE));
    expect(rules).toHaveLength(1);
    expect(rules[0]?.id).toBe('ACME-001');
    expect(rules[0]?.severity).toBe('warning');
    expect(rules[0]?.category).toBe('error-handling');
  });

  it('evaluates the expression and renders documented placeholders', () => {
    const rules = loadCustomXPathRules(write('rules.yaml', VALID_FILE));
    const doc = parseXml(`
      <mule xmlns="http://www.mulesoft.org/schema/mule/core">
        <flow name="no-handler-flow"><logger/></flow>
        <flow name="ok-flow"><error-handler/></flow>
      </mule>`);

    const issues = rules[0].validate(doc.document!, context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toBe('Flow "no-handler-flow" does not declare an error handler.');
    expect(issues[0]?.ruleId).toBe('ACME-001');
    expect(issues[0]?.suggestion).toContain('error-handler');
  });

  it('leaves an unsupported placeholder literal', () => {
    const rules = loadCustomXPathRules(
      write(
        'rules.yaml',
        `
rules:
  - id: ACME-009
    name: Placeholder probe
    description: probe
    category: standards
    severity: info
    xpath: //mule:flow
    message: '{nodeName} {filePath} {line} {secret}'
`,
      ),
    );
    const doc = parseXml(
      '<mule xmlns="http://www.mulesoft.org/schema/mule/core"><flow name="f"/></mule>',
    );
    const message = rules[0].validate(doc.document!, context())[0]?.message ?? '';
    expect(message).toContain('flow');
    expect(message).toContain('src/main/mule/a.xml');
    expect(message).toContain('{secret}');
  });

  it('rejects a missing file', () => {
    expect(() => loadCustomXPathRules(path.join(dir, 'nope.yaml'))).toThrow(CustomRuleError);
  });

  it('rejects a URL', () => {
    expect(() => loadCustomXPathRules('https://example.com/rules.yaml')).toThrow(/local file/);
  });

  it('rejects invalid YAML', () => {
    expect(() => loadCustomXPathRules(write('bad.yaml', 'rules: [oops'))).toThrow(/valid YAML/);
  });

  it('rejects an invalid XPath expression', () => {
    expect(() =>
      loadCustomXPathRules(
        write(
          'bad.yaml',
          `
rules:
  - id: ACME-002
    name: Bad
    description: bad
    category: standards
    severity: info
    xpath: '//mule:flow[[['
    message: broken
`,
        ),
      ),
    ).toThrow(/Invalid XPath/);
  });

  it('rejects an unbound namespace prefix in an expression', () => {
    expect(() =>
      loadCustomXPathRules(
        write(
          'bad.yaml',
          `
rules:
  - id: ACME-003
    name: Unbound
    description: unbound
    category: standards
    severity: info
    xpath: //nope:thing
    message: broken
`,
        ),
      ),
    ).toThrow(CustomRuleError);
  });

  it('rejects a collision with a built-in ID', () => {
    const file = write(
      'collide.yaml',
      VALID_FILE.replace('ACME-001', 'SEC-012').replace(
        '//mule:flow[not(mule:error-handler)]',
        '//mule:flow',
      ),
    );
    expect(() => loadCustomXPathRules(file, ['SEC-012'])).toThrow(/collides with a built-in/);
  });

  it('rejects duplicate custom IDs', () => {
    const file = write(
      'dupe.yaml',
      `
rules:
  - id: ACME-004
    name: One
    description: one
    category: standards
    severity: info
    xpath: //mule:flow
    message: one
  - id: ACME-004
    name: Two
    description: two
    category: standards
    severity: info
    xpath: //mule:flow
    message: two
`,
    );
    expect(() => loadCustomXPathRules(file)).toThrow(/Duplicate custom rule ID/);
  });

  it('rejects a malformed ID, an unknown category, and an unknown key', () => {
    const base = (body: string): string => write('x.yaml', body);
    expect(() =>
      loadCustomXPathRules(
        base(`
rules:
  - id: acme1
    name: n
    description: d
    category: standards
    severity: info
    xpath: //mule:flow
    message: m
`),
      ),
    ).toThrow(/ACME-001/);

    expect(() =>
      loadCustomXPathRules(
        base(`
rules:
  - id: ACME-005
    name: n
    description: d
    category: not-a-category
    severity: info
    xpath: //mule:flow
    message: m
`),
      ),
    ).toThrow(CustomRuleError);

    expect(() =>
      loadCustomXPathRules(
        base(`
rules:
  - id: ACME-006
    name: n
    description: d
    category: standards
    severity: info
    xpath: //mule:flow
    message: m
    runScript: rm -rf /
`),
      ),
    ).toThrow(CustomRuleError);
  });

  it('supports additional namespaces', () => {
    const rules = loadCustomXPathRules(
      write(
        'ns.yaml',
        `
namespaces:
  acme: https://schemas.example.com/mule/acme
rules:
  - id: ACME-002
    name: ACME audit marker
    description: ACME outbound calls require an audit marker.
    category: governance
    severity: warning
    xpath: //acme:request[not(@audit)]
    message: '{nodeName} is missing the audit attribute.'
`,
      ),
    );

    const doc = parseXml(`
      <mule xmlns="http://www.mulesoft.org/schema/mule/core"
            xmlns:acme="https://schemas.example.com/mule/acme">
        <acme:request/>
      </mule>`);
    const issues = rules[0].validate(doc.document!, context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toBe('request is missing the audit attribute.');
  });

  it('rejects redefining a built-in prefix', () => {
    expect(() =>
      loadCustomXPathRules(
        write(
          'ns.yaml',
          `
namespaces:
  http: https://example.com/not-http
rules:
  - id: ACME-007
    name: n
    description: d
    category: standards
    severity: info
    xpath: //mule:flow
    message: m
`,
        ),
      ),
    ).toThrow(/built in and cannot be redefined/);
  });

  it('does not mutate the shared XPathHelper singleton', () => {
    loadCustomXPathRules(
      write(
        'ns.yaml',
        `
namespaces:
  acme: https://schemas.example.com/mule/acme
rules:
  - id: ACME-008
    name: n
    description: d
    category: standards
    severity: info
    xpath: //acme:request
    message: m
`,
      ),
    );

    // The built-in helper must still reject the custom prefix.
    expect(() => {
      XPathHelper.getInstance().compile('//acme:request');
    }).toThrow();
  });
});

describe('custom rules through the engine', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-custom-project-'));
    fs.mkdirSync(path.join(projectRoot, 'src/main/mule'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
    fs.writeFileSync(
      path.join(projectRoot, 'src/main/mule/app.xml'),
      `<mule xmlns="http://www.mulesoft.org/schema/mule/core"><flow name="no-handler"><logger/></flow></mule>`,
    );
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('reports custom findings but leaves the quality rating unchanged', async () => {
    const { LintEngine } = await import('../../src/engine/LintEngine');
    const customRules = loadCustomXPathRules(write('rules.yaml', VALID_FILE));

    const withoutCustom = await new LintEngine({ rules: [] }).scan(projectRoot);
    const withCustom = await new LintEngine({ rules: customRules }).scan(projectRoot);

    const issues = withCustom.files.flatMap((file) => file.issues);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('ACME-001');

    // The finding is reported, but code smells are unchanged.
    expect(withCustom.metrics?.maintainability?.technicalDebtMinutes).toBe(
      withoutCustom.metrics?.maintainability?.technicalDebtMinutes,
    );
  });
});
