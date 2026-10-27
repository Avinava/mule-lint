import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  isPlaintextSecret,
  isSensitiveAttribute,
  isSensitiveKey,
} from '../../src/core/SensitiveKeys';
import { collectReferences, indexYamlKeys, platformSecureKeys } from '../../src/core/SecretModel';
import { parseXml } from '../../src/core/XmlParser';
import { HardcodedCredentialsRule } from '../../src/rules/security/HardcodedCredentialsRule';
import { ConnectorCredentialsSecuredRule } from '../../src/rules/security/ConnectorCredentialsSecuredRule';
import {
  PlatformSecurePropertyPrefixRule,
  UnresolvedSecureReferenceRule,
  UnusedSensitivePropertyRule,
} from '../../src/rules/security/SecretModelRules';
import { ConnectorDebugLoggingRule } from '../../src/rules/logging/ConnectorDebugLoggingRule';
import { JavaRuntimeCompatibilityRule } from '../../src/rules/operations/JavaRuntimeCompatibilityRule';
import {
  BasicAuthApiVersionRule,
  ReplayListenerPrimaryNodeRule,
  ReplayOnlyNewRule,
} from '../../src/rules/connector/SalesforceRules';
import { NonProductionEndpointRule } from '../../src/rules/experimental/NonProductionEndpointRule';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';
import { ValidationContext, ProjectContext } from '../../src/types';

interface Vectors {
  keys: { key: string; sensitive: boolean }[];
  values: { key: string; value: string | number; plaintext: boolean }[];
}

const vectors = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/sensitive-key-vectors.json'), 'utf8'),
) as Vectors;

const MULE = 'http://www.mulesoft.org/schema/mule/core';
const SF = 'http://www.mulesoft.org/schema/mule/salesforce';
const DB = 'http://www.mulesoft.org/schema/mule/db';
const SECURE = 'http://www.mulesoft.org/schema/mule/secure-properties';

let projectRoot: string;

const write = (relativePath: string, content: string): void => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const context = (
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

const doc = (xml: string): Document => {
  const result = parseXml(xml);
  expect(result.success).toBe(true);
  return result.document!;
};

const mule = (body: string): string =>
  `<mule xmlns="${MULE}" xmlns:salesforce="${SF}" xmlns:db="${DB}" xmlns:secure-properties="${SECURE}" xmlns:doc="http://www.mulesoft.org/schema/mule/documentation">${body}</mule>`;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-secret-model-'));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe('shared sensitive-key vectors (mule-build parity)', () => {
  it.each(vectors.keys)('classifies key $key as sensitive=$sensitive', ({ key, sensitive }) => {
    expect(isSensitiveKey(key)).toBe(sensitive);
  });

  it.each(vectors.values)(
    'classifies $key=$value as plaintext=$plaintext',
    ({ key, value, plaintext }) => {
      expect(isPlaintextSecret(key, value)).toBe(plaintext);
    },
  );
});

describe('isSensitiveAttribute', () => {
  const element = (localName: string, namespaceURI: string | null = MULE) => ({
    localName,
    namespaceURI,
  });

  it('matches attribute endings, not substrings', () => {
    expect(isSensitiveAttribute(element('basic-connection'), 'securityToken')).toBe(true);
    expect(isSensitiveAttribute(element('basic-connection'), 'storePassword')).toBe(true);
    expect(isSensitiveAttribute(element('request-config'), 'tokenUrl')).toBe(false);
    expect(isSensitiveAttribute(element('config'), 'passwordPolicy')).toBe(false);
  });

  it('skips namespaced attributes', () => {
    expect(isSensitiveAttribute(element('flow'), 'doc:password')).toBe(false);
  });

  it('treats the secure-properties decryption key as a secret on that element only', () => {
    expect(isSensitiveAttribute(element('config', SECURE), 'key')).toBe(true);
    expect(isSensitiveAttribute(element('config', MULE), 'key')).toBe(false);
  });
});

describe('SecretModel helpers', () => {
  it('reads plain secureProperties entries as platform keys', () => {
    expect([
      ...platformSecureKeys(['sample.password', 'secure::sample.key', 'secure\\:\\:x']),
    ]).toEqual(['sample.password']);
  });

  it('finds ${}, secure::, and DataWeave p() references with lines', () => {
    const references = collectReferences(
      'a=${one}\nb="#[p(\'secure::two\')]"\n<!-- ${ignored} -->',
      'x.xml',
    );
    expect(references).toEqual([
      { name: 'one', secure: false, relativePath: 'x.xml', line: 1 },
      { name: 'two', secure: true, relativePath: 'x.xml', line: 2 },
    ]);
  });

  it('indexes nested YAML keys with lines and skips block scalars', () => {
    const entries = indexYamlKeys(
      [
        'sample:',
        '  db:',
        '    password: "![abc]"',
        '    host: db.example.invalid # comment',
        '  note: |',
        '    not: a key',
        'http:',
        '  port: 8081',
      ].join('\n'),
    );
    expect(entries).toEqual([
      { key: 'sample.db.password', value: '![abc]', line: 3 },
      { key: 'sample.db.host', value: 'db.example.invalid', line: 4 },
      { key: 'sample.note', value: '', line: 5 },
      { key: 'http.port', value: '8081', line: 8 },
    ]);
  });
});

describe('MULE-201 HardcodedCredentialsRule', () => {
  const rule = new HardcodedCredentialsRule();
  const validate = (xml: string) => rule.validate(doc(mule(xml)), context());

  it('no longer flags tokenUrl or passwordPolicy-style attributes', () => {
    expect(
      validate(
        '<http:request-config xmlns:http="h" tokenUrl="https://auth.example.invalid/token" />',
      ),
    ).toHaveLength(0);
  });

  it('flags new endings such as securityToken and passphrase', () => {
    const issues = validate(
      '<salesforce:sfdc-config><salesforce:basic-connection securityToken="literal-token" /></salesforce:sfdc-config><x:key xmlns:x="k" passphrase="literal" />',
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      'Hardcoded securityToken found - use secure property placeholder',
      'Hardcoded passphrase found - use secure property placeholder',
    ]);
    expect(issues[0]?.suggestion).toContain('mule-artifact.json secureProperties');
  });

  it('leaves a literal secure-properties key to SEC-008', () => {
    expect(validate('<secure-properties:config key="literal-key" file="x.yaml" />')).toHaveLength(
      0,
    );
  });

  it('ignores multi-line DataWeave values', () => {
    expect(validate('<db:generic-connection password="#[\n  vars.password\n]" />')).toHaveLength(0);
  });
});

describe('SEC-007 ConnectorCredentialsSecuredRule', () => {
  const rule = new ConnectorCredentialsSecuredRule();
  const connection =
    '<salesforce:sfdc-config><salesforce:basic-connection username="${sample.username}" password="${sample.password}" /></salesforce:sfdc-config>';

  it('accepts a plain ${key} declared as a platform secure property', () => {
    const issues = rule.validate(
      doc(mule(connection)),
      context({}, { platformSecureProperties: ['sample.password', 'sample.username'] }),
    );
    expect(issues).toHaveLength(0);
  });

  it('warns, naming both models, when a plain ${key} is not declared', () => {
    const issues = rule.validate(
      doc(mule(connection)),
      context({}, { platformSecureProperties: ['sample.username'] }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.suggestion).toContain('${secure::sample.password}');
    expect(issues[0]?.suggestion).toContain('${sample.password}');
  });

  it('accepts ${secure::key} and errors on a hardcoded credential', () => {
    const issues = rule.validate(
      doc(
        mule(
          '<salesforce:sfdc-config><salesforce:basic-connection username="${secure::sample.username}" password="literal-value" /></salesforce:sfdc-config>',
        ),
      ),
      context(),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toBe('Credential "password" is hardcoded');
  });
});

describe('SEC-017 / SEC-018 secret-model rules', () => {
  const setUp = (options: {
    secureProperties?: string[];
    secureConfig?: boolean;
    reference: string;
    defined?: string;
    domain?: boolean;
  }) => {
    write(
      'mule-artifact.json',
      JSON.stringify({ minMuleVersion: '4.6.0', secureProperties: options.secureProperties ?? [] }),
    );
    write(
      'pom.xml',
      options.domain
        ? '<project><dependencies><dependency><artifactId>sample-domain</artifactId><classifier>mule-domain</classifier></dependency></dependencies></project>'
        : '<project />',
    );
    write(
      'src/main/mule/global.xml',
      mule(
        `${options.secureConfig ? '<secure-properties:config key="${secure.key}" file="secure.yaml" />' : ''}\n<db:generic-connection password="${options.reference}" />`,
      ),
    );
    if (options.defined) write('src/main/resources/secure.yaml', options.defined);
  };

  it('SEC-017 errors when a platform key is referenced with secure::', () => {
    setUp({ secureProperties: ['sample.password'], reference: '${secure::sample.password}' });
    const issues = new PlatformSecurePropertyPrefixRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'SEC-017',
      severity: 'error',
      relativePath: 'src/main/mule/global.xml',
      line: 2,
    });
  });

  it('SEC-017 passes when the platform key is also defined encrypted', () => {
    setUp({
      secureProperties: ['sample.password'],
      secureConfig: true,
      reference: '${secure::sample.password}',
      defined: 'sample:\n  password: "![abc]"\n',
    });
    expect(new PlatformSecurePropertyPrefixRule().runProject(context())).toHaveLength(0);
  });

  it('SEC-017 treats secure::-named entries as module-backed', () => {
    setUp({
      secureProperties: ['secure::sample.password'],
      reference: '${secure::sample.password}',
    });
    expect(new PlatformSecurePropertyPrefixRule().runProject(context())).toHaveLength(0);
  });

  it('SEC-018 warns when no secure-properties:config is configured', () => {
    setUp({ reference: '${secure::sample.password}' });
    const issues = new UnresolvedSecureReferenceRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toContain('so it cannot resolve');
  });

  it('SEC-018 mentions the shared domain only when the POM depends on one', () => {
    setUp({ reference: '${secure::sample.password}', domain: true });
    const issues = new UnresolvedSecureReferenceRule().runProject(context());
    expect(issues[0]?.message).toContain('the shared domain may provide one');
  });

  it('SEC-018 warns when the config exists but no file defines the key', () => {
    setUp({
      secureConfig: true,
      reference: '${secure::sample.password}',
      defined: 'sample:\n  other: "![abc]"\n',
    });
    const issues = new UnresolvedSecureReferenceRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toBe(
      'secure::sample.password is not defined in any scanned configuration file',
    );
  });

  it('SEC-018 passes a defined key and leaves platform keys to SEC-017', () => {
    setUp({
      secureConfig: true,
      reference: '${secure::sample.password}',
      defined: 'sample:\n  password: "![abc]"\n',
    });
    expect(new UnresolvedSecureReferenceRule().runProject(context())).toHaveLength(0);

    setUp({ secureProperties: ['sample.password'], reference: '${secure::sample.password}' });
    expect(new UnresolvedSecureReferenceRule().runProject(context())).toHaveLength(0);
  });
});

describe('SEC-019 UnusedSensitivePropertyRule', () => {
  const rule = new UnusedSensitivePropertyRule();

  it('reports an unreferenced sensitive key at its line, once', () => {
    write(
      'src/main/mule/app.xml',
      mule('<db:generic-connection password="${secure::db.password}" />'),
    );
    write(
      'src/main/resources/dev.yaml',
      'db:\n  password: "![a]"\n  legacyPassword: "![b]"\nanypoint:\n  platform:\n    client_secret: "x"\n',
    );
    write('src/main/resources/qa.properties', 'db.legacyPassword=![c]\n');
    const issues = rule.runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'SEC-019',
      relativePath: 'src/main/resources/dev.yaml',
      line: 3,
    });
  });

  it('counts DataWeave and configuration-value references, and honors ignoredKeys', () => {
    write('src/main/resources/dw/token.dwl', "%dw 2.0\noutput json\n---\n{ t: p('api.token') }");
    write(
      'src/main/resources/dev.properties',
      'api.token=![a]\nother.secret=${api.token}\nkept.secret=![b]\n',
    );
    expect(rule.runProject(context()).map((issue) => issue.message)).toEqual([
      'Sensitive key "other.secret" is defined but never referenced',
      'Sensitive key "kept.secret" is defined but never referenced',
    ]);
    expect(rule.runProject(context({ ignoredKeys: ['other.secret', 'kept.secret'] }))).toHaveLength(
      0,
    );
  });
});

describe('LOG-006 ConnectorDebugLoggingRule', () => {
  const rule = new ConnectorDebugLoggingRule();

  it('flags connector categories at DEBUG/TRACE only', () => {
    write(
      'src/main/resources/log4j2.xml',
      [
        '<Configuration><Loggers>',
        '<AsyncLogger name="org.mule.extension.db" level="DEBUG"/>',
        '<AsyncLogger name="com.mulesoft.connectors.kafka" level="trace"/>',
        '<AsyncLogger name="org.mule.extension.vm" level="INFO"/>',
        '<AsyncLogger name="com.example.app" level="DEBUG"/>',
        '</Loggers></Configuration>',
      ].join('\n'),
    );
    const issues = rule.runProject(context());
    expect(issues.map((issue) => issue.line)).toEqual([2, 3]);
    expect(issues[0]?.relativePath).toBe('src/main/resources/log4j2.xml');
  });

  it('leaves credential-writing categories to LOG-007', () => {
    write(
      'src/main/resources/log4j2.xml',
      [
        '<Configuration><Loggers>',
        '<AsyncLogger name="org.mule.extension.salesforce" level="DEBUG"/>',
        '<AsyncLogger name="org.mule.service.http.impl.service.HttpMessageLogger" level="trace"/>',
        '</Loggers></Configuration>',
      ].join('\n'),
    );
    expect(rule.runProject(context())).toHaveLength(0);
  });

  it('accepts additional categories', () => {
    write(
      'src/main/resources/log4j2.xml',
      '<Configuration><Loggers><Logger name="com.example.client" level="DEBUG"/></Loggers></Configuration>',
    );
    expect(rule.runProject(context())).toHaveLength(0);
    expect(rule.runProject(context({ additionalCategories: ['com.example.'] }))).toHaveLength(1);
  });
});

describe('OPS-005 JavaRuntimeCompatibilityRule', () => {
  const rule = new JavaRuntimeCompatibilityRule();
  const descriptor = (minMuleVersion: string, java: string[]) => {
    write(
      'mule-artifact.json',
      JSON.stringify({ minMuleVersion, javaSpecificationVersions: java }, null, 2),
    );
  };

  it('flags a descriptor whose Java versions the minimum runtime cannot run', () => {
    descriptor('4.9.0', ['11']);
    const issues = rule.runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ relativePath: 'mule-artifact.json', line: 3 });
    expect(issues[0]?.message).toContain('supports Java 17');
  });

  it('accepts an overlapping version and normalizes 1.8', () => {
    descriptor('4.9.0', ['11', '17']);
    expect(rule.runProject(context())).toHaveLength(0);
    descriptor('4.5.0', ['1.8']);
    expect(rule.runProject(context())).toHaveLength(0);
    descriptor('4.5.0', ['17']);
    expect(rule.runProject(context())).toHaveLength(1);
  });

  it('does not judge runtime lines outside the documented table', () => {
    descriptor('4.4.0', ['17']);
    expect(rule.runProject(context())).toHaveLength(0);
    descriptor('4.14.0', ['21']);
    expect(rule.runProject(context())).toHaveLength(0);
  });
});

describe('Salesforce connector rules', () => {
  const listener = (attributes: string) =>
    doc(
      mule(
        `<flow name="f"><salesforce:replay-channel-listener config-ref="c" streamingChannel="/data/SampleEvent" ${attributes}/></flow>`,
      ),
    );

  it('SF-003 flags ONLY_NEW without autoReplay', () => {
    const rule = new ReplayOnlyNewRule();
    expect(rule.validate(listener('replayOption="ONLY_NEW"'), context())).toHaveLength(1);
    expect(
      rule.validate(listener('replayOption="ONLY_NEW" autoReplay="true"'), context()),
    ).toHaveLength(0);
    expect(rule.validate(listener('replayOption="FROM_LAST_REPLAY_ID"'), context())).toHaveLength(
      0,
    );
  });

  it('SF-005 flags a Replay listener without primaryNodeOnly', () => {
    const rule = new ReplayListenerPrimaryNodeRule();
    expect(rule.validate(listener('replayOption="ALL"'), context())).toHaveLength(1);
    expect(
      rule.validate(listener('replayOption="ALL" primaryNodeOnly="true"'), context()),
    ).toHaveLength(0);
  });

  it('SF-004 flags an explicit Basic Auth URL above v64.0 only', () => {
    const rule = new BasicAuthApiVersionRule();
    const config = (url: string) =>
      doc(
        mule(
          `<salesforce:sfdc-config><salesforce:basic-connection ${url}/></salesforce:sfdc-config>`,
        ),
      );
    expect(
      rule.validate(config('url="https://login.salesforce.com/services/Soap/u/65.0"'), context()),
    ).toHaveLength(1);
    expect(
      rule.validate(config('url="https://login.salesforce.com/services/Soap/u/64.0"'), context()),
    ).toHaveLength(0);
    expect(rule.validate(config('url="${sample.url}"'), context())).toHaveLength(0);
    expect(rule.validate(config(''), context())).toHaveLength(0);
  });
});

describe('EXP-004 NonProductionEndpointRule', () => {
  it('flags a non-production file pointing at a production host', () => {
    write('src/main/resources/prod.yaml', 'crm:\n  url: "https://crm.example.invalid/api"\n');
    write(
      'src/main/resources/dev.yaml',
      'crm:\n  url: "https://crm.example.invalid/api"\nerp:\n  host: "erp-dev.example.invalid"\n',
    );
    write('src/main/resources/local.properties', 'crm.host=localhost\n');
    const issues = new NonProductionEndpointRule().runProject(context());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ relativePath: 'src/main/resources/dev.yaml', line: 2 });
  });
});

describe('engine integration', () => {
  it('feeds mule-artifact.json secureProperties to SEC-007 during a scan', async () => {
    write('mule-artifact.json', JSON.stringify({ secureProperties: ['sample.password'] }));
    write(
      'src/main/mule/global.xml',
      mule(
        '<db:config name="Database_Config"><db:generic-connection url="${db.url}" password="${sample.password}" /></db:config>',
      ),
    );
    write('src/main/resources/dev.properties', 'sample.password=\n');

    const engine = new LintEngine({
      rules: ALL_RULES.filter((rule) => ['SEC-007', 'SEC-017', 'SEC-018'].includes(rule.id)),
    });
    const report = await engine.scan(projectRoot);
    const issues = report.files.flatMap((file) => file.issues);
    expect(issues).toHaveLength(0);

    write('mule-artifact.json', JSON.stringify({ secureProperties: [] }));
    const undeclared = await engine.scan(projectRoot);
    expect(undeclared.files.flatMap((file) => file.issues).map((issue) => issue.ruleId)).toEqual([
      'SEC-007',
    ]);
  });
});
