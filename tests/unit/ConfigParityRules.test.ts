import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { UnresolvedPropertyPlaceholderRule } from '../../src/rules/standards/UnresolvedPropertyPlaceholderRule';
import { NamespaceDependencyRule } from '../../src/rules/governance/NamespaceDependencyRule';
import { UndefinedErrorTypeRule } from '../../src/rules/error-handling/UndefinedErrorTypeRule';
import { MUnitVersionParityRule } from '../../src/rules/testing/MUnitVersionParityRule';
import { SensitiveConnectorLoggerRule } from '../../src/rules/logging/SensitiveConnectorLoggerRule';
import { ConnectorDebugLoggingRule } from '../../src/rules/logging/ConnectorDebugLoggingRule';
import { MULE_MODULES } from '../../src/core/MuleModules';
import { SENSITIVE_LOG_CATEGORIES } from '../../src/core/SensitiveLogCategories';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';
import { Issue, ValidationContext } from '../../src/types';
import type { ProjectRule } from '../../src/rules/base/ProjectRule';

const FIXTURES = path.resolve('tests/fixtures/config-parity');
const PARITY_RULES = ['CFG-004', 'PROJ-003', 'ERR-005', 'TEST-002', 'LOG-007'];

const MULE = 'http://www.mulesoft.org/schema/mule/core';
const HTTP = 'http://www.mulesoft.org/schema/mule/http';
const DB = 'http://www.mulesoft.org/schema/mule/db';
const SECURE = 'http://www.mulesoft.org/schema/mule/secure-properties';

const contextFor = (root: string, options: Record<string, unknown> = {}): ValidationContext => ({
  filePath: path.join(root, 'pom.xml'),
  relativePath: 'Project Root',
  projectRoot: root,
  config: { enabled: true, options },
});

const run = (rule: ProjectRule, root: string, options: Record<string, unknown> = {}): Issue[] =>
  rule.runProject(contextFor(root, options));

const summary = (issues: Issue[]) =>
  issues.map((issue) => ({ path: issue.relativePath, line: issue.line, message: issue.message }));

let projectRoot: string;

const write = (relativePath: string, content: string): void => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const mule = (body: string): string =>
  `<mule xmlns="${MULE}" xmlns:http="${HTTP}" xmlns:db="${DB}" xmlns:secure-properties="${SECURE}">\n${body}\n</mule>`;

const pom = (dependencies: string[], extra = ''): string =>
  `<project>${extra}<dependencies>${dependencies
    .map((id) => `<dependency><artifactId>${id}</artifactId></dependency>`)
    .join('')}</dependencies></project>`;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-config-parity-'));
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe('config parity fixtures', () => {
  const valid = path.join(FIXTURES, 'valid');
  const invalid = path.join(FIXTURES, 'invalid');

  it.each([
    ['CFG-004', new UnresolvedPropertyPlaceholderRule()],
    ['PROJ-003', new NamespaceDependencyRule()],
    ['ERR-005', new UndefinedErrorTypeRule()],
    ['TEST-002', new MUnitVersionParityRule()],
    ['LOG-007', new SensitiveConnectorLoggerRule()],
    ['LOG-006', new ConnectorDebugLoggingRule()],
  ])('%s reports nothing for the valid project', (_id, rule) => {
    expect(summary(run(rule, valid))).toEqual([]);
  });

  it('CFG-004 reports undefined, per-environment, secure-only, and mixed references', () => {
    const issues = run(new UnresolvedPropertyPlaceholderRule(), invalid);
    expect(
      issues.every((issue) => issue.ruleId === 'CFG-004' && issue.severity === 'warning'),
    ).toBe(true);
    expect(summary(issues)).toEqual([
      {
        path: 'src/main/mule/global.xml',
        line: 14,
        message:
          '"partner.host" is missing from src/main/resources/prod.yaml, so it does not resolve in that environment',
      },
      {
        path: 'src/main/mule/global.xml',
        line: 16,
        message:
          '"partner.user" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties',
      },
      {
        path: 'src/main/mule/global.xml',
        line: 16,
        message:
          '"partner.password" is defined only in a secure properties file, so ${partner.password} does not resolve',
      },
      {
        path: 'src/main/mule/global.xml',
        line: 27,
        message:
          '"db.password" is referenced as ${db.password} here and as ${secure::db.password} in src/main/mule/global.xml; each form resolves from a different source, so one of them fails',
      },
    ]);
  });

  it('PROJ-003 reports each used namespace without a dependency at its first element', () => {
    const issues = run(new NamespaceDependencyRule(), invalid);
    expect(summary(issues)).toEqual([
      {
        path: 'src/main/mule/global.xml',
        line: 7,
        message: `Namespace ${SECURE} (prefix "secure-properties") is used, but pom.xml declares no mule-secure-configuration-property-module dependency`,
      },
      {
        path: 'src/main/mule/global.xml',
        line: 21,
        message: `Namespace ${DB} (prefix "db") is used, but pom.xml declares no mule-db-connector dependency`,
      },
    ]);
    expect(issues.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('ERR-005 reports unknown core, unconfigured connector, and never-raised custom types', () => {
    const issues = run(new UndefinedErrorTypeRule(), invalid);
    expect(issues.map((issue) => [issue.line, issue.severity])).toEqual([
      [26, 'error'],
      [29, 'error'],
      [32, 'error'],
    ]);
    expect(issues.map((issue) => issue.message)).toEqual([
      'MULE:NOT_A_CORE_TYPE is not a core Mule error type, so the application fails to deploy',
      'SALESFORCE:CONNECTIVITY uses the SALESFORCE error namespace, but no SALESFORCE connector element is configured and pom.xml declares no mule-salesforce-connector dependency',
      'APP:NEVER_RAISED is caught but never raised by raise-error or produced by an error-mapping targetType, so it is undefined',
    ]);
  });

  it('TEST-002 reports a version mismatch and MUnit below 3.1.0 on Java 17', () => {
    const issues = run(new MUnitVersionParityRule(), invalid);
    expect(summary(issues)).toEqual([
      {
        path: 'pom.xml',
        line: 33,
        message: 'munit-tools version 3.1.0 differs from munit-maven-plugin version 3.0.0',
      },
      {
        path: 'pom.xml',
        line: 11,
        message:
          'munit-maven-plugin version 3.0.0 does not support Java 17, which mule-artifact.json declares; MUnit 3.1.0 is the first release that does',
      },
      {
        path: 'pom.xml',
        line: 26,
        message:
          'munit-runner version 3.0.0 does not support Java 17, which mule-artifact.json declares; MUnit 3.1.0 is the first release that does',
      },
    ]);
  });

  it('LOG-007 reports credential-writing categories, including through an ancestor', () => {
    const issues = run(new SensitiveConnectorLoggerRule(), invalid);
    expect(summary(issues)).toEqual([
      {
        path: 'src/main/resources/log4j2.xml',
        line: 4,
        message:
          'Logger "org.cometd" is set to DEBUG, which can write Bayeux handshake and session identifiers to the logs',
      },
      {
        path: 'src/main/resources/log4j2.xml',
        line: 5,
        message:
          'Logger "org.apache.http" is set to DEBUG, which enables org.apache.http.wire, org.apache.http.headers and can write HTTP wire content, including Authorization headers; HTTP headers, including Authorization to the logs',
      },
      {
        path: 'src/main/resources/log4j2.xml',
        line: 6,
        message:
          'Logger "com.mulesoft.connectors.salesforce" is set to TRACE, which can write Salesforce session identifiers and OAuth tokens to the logs',
      },
    ]);
    expect(issues.every((issue) => issue.severity === 'warning')).toBe(true);
  });

  it('LOG-006 leaves loggers LOG-007 owns and keeps other connector categories', () => {
    expect(summary(run(new ConnectorDebugLoggingRule(), invalid)).map((i) => i.line)).toEqual([7]);
  });

  it('never prints property or secret values in messages or suggestions', () => {
    const issues = PARITY_RULES.flatMap((id) => {
      const rule = ALL_RULES.find((candidate) => candidate.id === id) as ProjectRule;
      return run(rule, invalid);
    });
    const text = issues.map((issue) => `${issue.message} ${issue.suggestion ?? ''}`).join('\n');
    for (const value of ['c2FtcGxl', 'example.invalid', 'jdbc:', '0.0.0.0']) {
      expect(text).not.toContain(value);
    }
  });

  it('runs through the engine and attributes findings to their files', async () => {
    const engine = new LintEngine({
      rules: ALL_RULES.filter((rule) => PARITY_RULES.includes(rule.id)),
    });
    const report = await engine.scan(invalid);
    const counts = new Map<string, number>();
    for (const issue of report.files.flatMap((file) => file.issues)) {
      counts.set(issue.ruleId, (counts.get(issue.ruleId) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({
      'CFG-004': 4,
      'PROJ-003': 2,
      'ERR-005': 3,
      'TEST-002': 3,
      'LOG-007': 3,
    });

    const clean = await engine.scan(valid);
    expect(clean.files.flatMap((file) => file.issues)).toEqual([]);
  });
});

describe('CFG-004 UnresolvedPropertyPlaceholderRule', () => {
  const rule = new UnresolvedPropertyPlaceholderRule();

  it('accepts runtime-supplied keys and honors allowedKeys and allowedPrefixes', () => {
    write(
      'src/main/mule/app.xml',
      mule(
        '<http:listener-config name="l"><http:listener-connection host="${app.name}" port="${http.port}" /></http:listener-config>\n<flow name="f"><logger message="${deploy.region} ${ops.team.alias}" /></flow>',
      ),
    );
    expect(run(rule, projectRoot).map((issue) => issue.message)).toEqual([
      '"deploy.region" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties',
      '"ops.team.alias" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties',
    ]);
    expect(
      run(rule, projectRoot, { allowedKeys: ['deploy.region'], allowedPrefixes: ['ops.'] }),
    ).toHaveLength(0);
  });

  it('ignores files that exist but no configuration-properties element loads', () => {
    write('src/main/resources/orphan.yaml', 'orphan:\n  key: "value"\n');
    write(
      'src/main/mule/app.xml',
      mule('<flow name="f"><logger message="${orphan.key}" /></flow>'),
    );
    expect(run(rule, projectRoot)).toHaveLength(1);
  });

  it('skips undefined-key findings when a loaded file cannot be located', () => {
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="${app.home}/external.yaml" />\n<flow name="f"><logger message="${somewhere.key}" /></flow>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('treats a key in an unpatterned common file as defined for every environment', () => {
    write('src/main/resources/dev.yaml', 'only:\n  dev: "1"\n');
    write('src/main/resources/prod.yaml', 'other: "1"\n');
    write('src/main/resources/common.yaml', 'shared:\n  key: "1"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="${mule.env}.yaml" />\n<configuration-properties file="common.yaml" />\n<flow name="f"><logger message="${shared.key} ${only.dev}" /></flow>',
      ),
    );
    expect(run(rule, projectRoot).map((issue) => issue.message)).toEqual([
      '"only.dev" is missing from src/main/resources/prod.yaml, so it does not resolve in that environment',
    ]);
  });

  it('reports a secure:: key defined only in a plain file once the module is configured', () => {
    write('src/main/resources/app.yaml', 'api:\n  secret: "![abc]"\n');
    write('src/main/resources/secure.yaml', 'other: "![def]"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="app.yaml" />\n<secure-properties:config name="s" file="secure.yaml" key="${runtime.key}" />\n<flow name="f"><logger message="${secure::api.secret}" /></flow>',
      ),
    );
    expect(run(rule, projectRoot).map((issue) => issue.message)).toEqual([
      'secure::api.secret is defined, but not in a file loaded by secure-properties:config, so it does not resolve',
    ]);
  });

  it('leaves secure:: keys with no definition to SEC-018 and platform keys to SEC-017', () => {
    write('mule-artifact.json', JSON.stringify({ secureProperties: ['platform.secret'] }));
    write(
      'src/main/mule/app.xml',
      mule(
        '<flow name="f"><logger message="${secure::nowhere.secret} ${secure::platform.secret} ${platform.secret}" /></flow>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('counts global-property names and skips nested and expression placeholders', () => {
    write(
      'src/main/mule/app.xml',
      mule(
        '<global-property name="feature.flag" value="on" />\n<flow name="f"><logger message="${feature.flag} ${a.${mule.env}.b}" /></flow>\n<!-- ${commented.out} -->',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });
});

describe('PROJ-003 NamespaceDependencyRule', () => {
  const rule = new NamespaceDependencyRule();

  it('ignores declared-but-unused namespaces and runtime namespaces', () => {
    write('pom.xml', pom([]));
    write(
      'src/main/mule/app.xml',
      `<mule xmlns="${MULE}" xmlns:db="${DB}" xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"><flow name="f"><ee:transform /></flow></mule>`,
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('downgrades to a warning when a parent POM may supply the dependency', () => {
    write('pom.xml', pom([], '<parent><artifactId>sample-parent</artifactId></parent>'));
    write('src/main/mule/app.xml', mule('<http:request-config name="r" />'));
    const issues = run(rule, projectRoot);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toContain('unless the parent POM supplies it');
  });

  it('honors ignoredNamespaces and skips projects without a POM', () => {
    write('src/main/mule/app.xml', mule('<http:request-config name="r" />'));
    expect(run(rule, projectRoot)).toHaveLength(0);
    write('pom.xml', pom([]));
    expect(run(rule, projectRoot)).toHaveLength(1);
    expect(run(rule, projectRoot, { ignoredNamespaces: [HTTP] })).toHaveLength(0);
  });

  it('keeps one data table with an artifactId for every namespace', () => {
    const namespaces = MULE_MODULES.map((entry) => entry.namespace);
    expect(new Set(namespaces).size).toBe(namespaces.length);
    for (const entry of MULE_MODULES) {
      expect(entry.namespace).toMatch(/^http:\/\/www\.mulesoft\.org\/schema\/mule\/[\w-]+$/);
      expect(entry.artifactIds.length).toBeGreaterThan(0);
    }
  });
});

describe('ERR-005 UndefinedErrorTypeRule', () => {
  const rule = new UndefinedErrorTypeRule();

  it('accepts namespace-less core types, wildcards, and connectors declared only in the POM', () => {
    write('pom.xml', pom(['mule-vm-connector']));
    write(
      'src/main/mule/app.xml',
      mule(
        '<flow name="f"><try><error-handler><on-error-continue type="CONNECTIVITY, EXPRESSION" /><on-error-continue type="*:TIMEOUT" /><on-error-continue type="VM:QUEUE_TIMEOUT" /><on-error-continue type="CUSTOM-MODULE:FAILED" /></error-handler></try></flow>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('reports an error-mapping sourceType from an unconfigured connector', () => {
    write('pom.xml', pom([]));
    write(
      'src/main/mule/app.xml',
      mule(
        '<flow name="f"><http:request config-ref="r"><error-mapping sourceType="DB:CONNECTIVITY" targetType="APP:DOWNSTREAM" /></http:request></flow>',
      ),
    );
    const issues = run(rule, projectRoot);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('DB:CONNECTIVITY uses the DB error namespace');
  });

  it('accepts APP:* only when something raises an APP type, and honors ignoredNamespaces', () => {
    write(
      'src/main/mule/app.xml',
      mule('<error-handler><on-error-continue type="APP:*" /></error-handler>'),
    );
    expect(run(rule, projectRoot)).toHaveLength(1);
    expect(run(rule, projectRoot, { ignoredNamespaces: ['app'] })).toHaveLength(0);
    write(
      'src/main/mule/app.xml',
      mule(
        '<error-handler><on-error-continue type="APP:*" /></error-handler><flow name="f"><raise-error type="APP:ANYTHING" /></flow>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('reports each undefined type once', () => {
    write(
      'src/main/mule/app.xml',
      mule(
        '<error-handler><on-error-continue type="MULE:BOGUS" /><on-error-propagate type="MULE:BOGUS" /></error-handler>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(1);
  });
});

describe('TEST-002 MUnitVersionParityRule', () => {
  const rule = new MUnitVersionParityRule();
  const munitPom = (plugin: string, runner: string, tools: string, properties = '') =>
    `<project><properties>${properties}</properties><build><plugins><plugin><artifactId>munit-maven-plugin</artifactId>${plugin}</plugin></plugins></build><dependencies><dependency><artifactId>munit-runner</artifactId><version>${runner}</version></dependency><dependency><artifactId>munit-tools</artifactId><version>${tools}</version></dependency></dependencies></project>`;

  it('falls back to the munit.version property when the plugin has no version', () => {
    write('pom.xml', munitPom('', '3.2.0', '3.2.0', '<munit.version>3.2.1</munit.version>'));
    const issues = run(rule, projectRoot);
    expect(issues.map((issue) => issue.message)).toEqual([
      'munit-runner version 3.2.0 differs from munit.version version 3.2.1',
      'munit-tools version 3.2.0 differs from munit.version version 3.2.1',
    ]);
  });

  it('detects Java 17 from a POM property and accepts 3.1.0 or later', () => {
    write(
      'pom.xml',
      munitPom(
        '<version>2.3.18</version>',
        '2.3.18',
        '2.3.18',
        '<maven.compiler.release>17</maven.compiler.release>',
      ),
    );
    expect(run(rule, projectRoot)).toHaveLength(3);
    expect(run(rule, projectRoot)[0]?.message).toContain(
      'which pom.xml maven.compiler.release declares',
    );
    write(
      'pom.xml',
      munitPom('<version>3.1.0</version>', '3.1.0', '3.1.0', '<java.version>17</java.version>'),
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('accepts matching older MUnit on Java 11 and skips projects without MUnit', () => {
    write('mule-artifact.json', JSON.stringify({ javaSpecificationVersions: ['11'] }));
    write('pom.xml', munitPom('<version>2.3.18</version>', '2.3.18', '2.3.18'));
    expect(run(rule, projectRoot)).toHaveLength(0);
    write('pom.xml', pom(['mule-http-connector']));
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('does not judge unresolved version properties', () => {
    write('pom.xml', munitPom('<version>${undefined.version}</version>', '3.1.0', '3.1.0'));
    expect(run(rule, projectRoot)).toHaveLength(0);
  });
});

describe('LOG-007 SensitiveConnectorLoggerRule', () => {
  const rule = new SensitiveConnectorLoggerRule();
  const log4j = (loggers: string): void => {
    write(
      'src/main/resources/log4j2.xml',
      `<Configuration><Loggers>${loggers}</Loggers></Configuration>`,
    );
  };

  it('reports a verbose root logger that no specific logger overrides', () => {
    log4j('<Root level="DEBUG" />');
    const issues = run(rule, projectRoot);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(
      /^The root logger is set to DEBUG, which enables org\.cometd/,
    );
  });

  it('lets a more specific logger at INFO override a verbose ancestor', () => {
    log4j(
      `<Logger name="org" level="TRACE" />${SENSITIVE_LOG_CATEGORIES.map((entry) => `<Logger name="${entry.category}" level="INFO" />`).join('')}<Root level="INFO" />`,
    );
    expect(run(rule, projectRoot)).toHaveLength(0);
  });

  it('accepts additional categories and ignores loggers without a level', () => {
    log4j('<Logger name="com.example.vendor.client" level="DEBUG" /><Logger name="org.cometd" />');
    expect(run(rule, projectRoot)).toHaveLength(0);
    expect(run(rule, projectRoot, { additionalCategories: ['com.example.vendor'] })).toHaveLength(
      1,
    );
  });

  it('reports a verbose sub-category of a sensitive category', () => {
    log4j('<Logger name="org.cometd.client" level="DEBUG" /><Root level="INFO" />');
    expect(run(rule, projectRoot).map((issue) => issue.message)).toEqual([
      'Logger "org.cometd.client" is set to DEBUG, which can write Bayeux handshake and session identifiers to the logs',
    ]);
  });

  it('skips projects without a parseable log4j2.xml', () => {
    expect(run(rule, projectRoot)).toHaveLength(0);
    write('src/main/resources/log4j2.xml', '<Configuration><Loggers>');
    expect(run(rule, projectRoot)).toHaveLength(0);
  });
});
