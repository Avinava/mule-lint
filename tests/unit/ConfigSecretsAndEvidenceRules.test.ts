import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PlaintextPropertiesSecretsRule } from '../../src/rules/standards/PlaintextPropertiesSecretsRule';
import { SecurePropertiesModuleRule } from '../../src/rules/security/SecurePropertiesModuleRule';
import { CorsPolicyEvidenceRule } from '../../src/rules/security/CorsPolicyEvidenceRule';
import { InboundAuthenticationEvidenceRule } from '../../src/rules/security/InboundAuthenticationEvidenceRule';
import { LintEngine } from '../../src/engine/LintEngine';
import { ValidationContext, ProjectContext, Issue } from '../../src/types';

let projectRoot: string;

const write = (relativePath: string, content: string): void => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const createContext = (
  options: Record<string, unknown> = {},
  projectContext?: Partial<ProjectContext>,
): ValidationContext => ({
  filePath: path.join(projectRoot, 'pom.xml'),
  relativePath: 'Project Root',
  projectRoot,
  config: { enabled: true, options },
  projectContext: projectContext
    ? { hasHttpListener: false, hasApikitRouter: false, ...projectContext }
    : undefined,
});

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-sec-'));
  fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe('CFG-003 PlaintextPropertiesSecretsRule', () => {
  const rule = new PlaintextPropertiesSecretsRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('CFG-003');
    expect(rule.severity).toBe('error');
    expect(rule.issueType).toBe('vulnerability');
  });

  it('flags plaintext secrets and reports the key, line, and file', () => {
    write(
      'src/main/resources/config/dev.properties',
      [
        '# comment',
        'salesforce.username=integration@example.com',
        'salesforce.password=Summer2026!',
        'api.client_secret: literal-secret',
      ].join('\n'),
    );

    const issues = rule.runProject(createContext());
    expect(issues).toHaveLength(2);
    expect(issues[0]?.line).toBe(3);
    expect(issues[0]?.relativePath).toBe(path.join('src/main/resources', 'config/dev.properties'));
    expect(issues[1]?.line).toBe(4);
  });

  it('never includes the secret value in the finding', () => {
    write('src/main/resources/a.properties', 'db.password=Summer2026!');
    const serialised = JSON.stringify(rule.runProject(createContext()));
    expect(serialised).not.toContain('Summer2026!');
    expect(serialised).toContain('db.password');
  });

  it('passes placeholders, encrypted values, and empty values', () => {
    write(
      'src/main/resources/a.properties',
      [
        'salesforce.password=${secure::salesforce.password}',
        'api.client_secret=${api.client-secret}',
        'db.password=![encrypted]',
        'other.token=',
      ].join('\n'),
    );
    expect(rule.runProject(createContext())).toHaveLength(0);
  });

  it('skips files recognised as already secure', () => {
    write('src/main/resources/dev-secure.properties', 'db.password=literal');
    expect(rule.runProject(createContext())).toHaveLength(0);
  });

  it('honours a custom secureFilePatterns option', () => {
    write('src/main/resources/vault.properties', 'db.password=literal');
    expect(rule.runProject(createContext())).toHaveLength(1);
    expect(rule.runProject(createContext({ secureFilePatterns: ['vault*'] }))).toHaveLength(0);
  });

  it('honours additionalSensitiveKeys', () => {
    write('src/main/resources/a.properties', 'app.signingMaterial=literal');
    expect(rule.runProject(createContext())).toHaveLength(0);
    expect(
      rule.runProject(createContext({ additionalSensitiveKeys: ['signingMaterial'] })),
    ).toHaveLength(1);
  });

  it('leaves YAML files to YAML-004', () => {
    write('src/main/resources/a.yaml', 'db:\n  password: literal\n');
    expect(rule.runProject(createContext())).toHaveLength(0);
  });

  it('reports nothing when there are no resources', () => {
    expect(rule.runProject(createContext())).toHaveLength(0);
  });

  it('attributes findings to the real file through a full scan', async () => {
    write('src/main/mule/app.xml', '<mule xmlns="http://www.mulesoft.org/schema/mule/core"/>');
    write('src/main/resources/secrets.properties', 'db.password=literal');

    const engine = new LintEngine({ rules: [new PlaintextPropertiesSecretsRule()] });
    const report = await engine.scan(projectRoot);
    const withIssues = report.files.filter((file) => file.issues.length > 0);

    expect(withIssues).toHaveLength(1);
    expect(withIssues[0]?.relativePath).toBe(path.join('src/main/resources', 'secrets.properties'));
    expect(withIssues[0]?.relativePath).not.toBe('Project Structure');
  });
});

describe('SEC-011 SecurePropertiesModuleRule', () => {
  const rule = new SecurePropertiesModuleRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-011');
    expect(rule.severity).toBe('warning');
  });

  it('reports when sensitive keys exist and no module is configured', () => {
    write('src/main/resources/a.yaml', 'database:\n  password: "![encrypted-value]"\n');
    const issues = rule.runProject(createContext({}, {}));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('database.password');
  });

  it('requires the module even when values are already encrypted', () => {
    write('src/main/resources/a.properties', 'db.password=![encrypted]');
    expect(rule.runProject(createContext({}, {}))).toHaveLength(1);
  });

  it('passes when the module is configured', () => {
    write('src/main/resources/a.properties', 'db.password=literal');
    expect(rule.runProject(createContext({}, { hasSecurePropertiesConfig: true }))).toHaveLength(0);
  });

  it('does not require the module when no sensitive keys exist', () => {
    write('src/main/resources/a.properties', 'http.port=8081');
    expect(rule.runProject(createContext({}, {}))).toHaveLength(0);
  });

  it('reports a project-level issue with no file attribution', () => {
    write('src/main/resources/a.properties', 'db.password=literal');
    const issues = rule.runProject(createContext({}, {}));
    expect(issues[0]?.line).toBe(0);
    expect(issues[0]?.relativePath).toBeUndefined();
  });
});

describe('SEC-015 CorsPolicyEvidenceRule', () => {
  const rule = new CorsPolicyEvidenceRule();
  const run = (options = {}, projectContext: Partial<ProjectContext> = {}): Issue[] =>
    rule.runProject(createContext(options, { hasHttpListener: true, ...projectContext }));

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-015');
    expect(rule.severity).toBe('info');
  });

  it('emits nothing when browser exposure is not indicated', () => {
    expect(run()).toHaveLength(0);
  });

  it('reports when explicitly browser-facing with no CORS element', () => {
    expect(run({ browserFacing: true })).toHaveLength(1);
  });

  it('reports when an OPTIONS flow exists', () => {
    expect(run({}, { hasOptionsFlow: true })).toHaveLength(1);
  });

  it('passes when a CORS element is present', () => {
    expect(run({ browserFacing: true }, { hasCorsConfig: true })).toHaveLength(0);
  });

  it('accepts auto-discovery only when allowGatewayManagedCors is set', () => {
    expect(run({ browserFacing: true }, { hasAutoDiscovery: true })).toHaveLength(1);
    expect(
      run({ browserFacing: true, allowGatewayManagedCors: true }, { hasAutoDiscovery: true }),
    ).toHaveLength(0);
  });

  it('emits nothing for a project with no HTTP listener', () => {
    expect(
      rule.runProject(createContext({ browserFacing: true }, { hasHttpListener: false })),
    ).toHaveLength(0);
  });
});

describe('SEC-016 InboundAuthenticationEvidenceRule', () => {
  const rule = new InboundAuthenticationEvidenceRule();
  const run = (options = {}, projectContext: Partial<ProjectContext> = {}): Issue[] =>
    rule.runProject(createContext(options, { hasHttpListener: true, ...projectContext }));

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('SEC-016');
    expect(rule.severity).toBe('warning');
  });

  it('reports when no authentication evidence is visible', () => {
    const issues = run({}, { listenerEndpoints: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('No authentication evidence');
  });

  it('does not claim the API is unauthenticated', () => {
    const message = run()[0]?.message ?? '';
    expect(message).toContain('may be managed outside this repository');
    expect(message).not.toMatch(/is unauthenticated|has no authentication/i);
  });

  it('pluralises the listener count', () => {
    const one = run(
      {},
      {
        listenerEndpoints: [{ relativePath: 'a.xml', line: 1 }],
      },
    )[0]?.message;
    expect(one).toContain('1 inbound HTTP flow.');

    const many = run(
      {},
      {
        listenerEndpoints: [
          { relativePath: 'a.xml', line: 1 },
          { relativePath: 'b.xml', line: 2 },
        ],
      },
    )[0]?.message;
    expect(many).toContain('2 inbound HTTP flows');
  });

  it('passes when authentication evidence is present', () => {
    expect(run({}, { hasAuthEvidence: true })).toHaveLength(0);
  });

  it('accepts auto-discovery only when acceptGatewayPolicies is set', () => {
    expect(run({}, { hasAutoDiscovery: true })).toHaveLength(1);
    expect(run({ acceptGatewayPolicies: true }, { hasAutoDiscovery: true })).toHaveLength(0);
  });

  it('emits nothing for a project with no HTTP listener', () => {
    expect(rule.runProject(createContext({}, { hasHttpListener: false }))).toHaveLength(0);
  });
});
