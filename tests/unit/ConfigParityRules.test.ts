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
          '"partner.host" is missing from src/main/resources/prod.yaml, so it does not resolve when mule.env=prod',
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
          '"db.password" is referenced both as ${db.password} and as ${secure::db.password}; ${db.password} does not resolve because only a secure properties file defines it',
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
    const issues = new ConnectorDebugLoggingRule().runProject({
      ...contextFor(invalid),
      projectContext: {
        hasHttpListener: false,
        hasApikitRouter: false,
        enabledRuleIds: ['LOG-006', 'LOG-007'],
      },
    });
    expect(summary(issues).map((i) => i.line)).toEqual([7]);
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
        '<http:listener-config name="l"><http:listener-connection host="${app.name}" port="${mule.home}" /></http:listener-config>\n<flow name="f"><logger message="${deploy.region} ${ops.team.alias}" /></flow>',
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
      '"only.dev" is missing from src/main/resources/prod.yaml, so it does not resolve when mule.env=prod',
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

describe('gate review fixes', () => {
  const cfg = new UnresolvedPropertyPlaceholderRule();
  const messages = (issues: Issue[]) => issues.map((issue) => issue.message);

  it('CFG-004 still judges keys from located files when another load cannot be located', () => {
    write('src/main/resources/dev.yaml', 'partner:\n  host: "a"\n');
    write('src/main/resources/prod.yaml', 'other: "b"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="${mule.env}.yaml" />\n<configuration-properties file="${app.home}/local.yaml" />\n<flow name="f"><logger message="${partner.host} ${maybe.external}" /></flow>',
      ),
    );
    expect(messages(run(cfg, projectRoot))).toEqual([
      '"partner.host" is missing from src/main/resources/prod.yaml, so it does not resolve when mule.env=prod',
    ]);
  });

  it('CFG-004 checks every binding of a multi-placeholder file pattern', () => {
    write('src/main/resources/config/eu/dev.yaml', 'region:\n  key: "a"\n');
    write('src/main/resources/config/eu/prod.yaml', 'other: "b"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="config/${region}/${mule.env}.yaml" />\n<flow name="f"><logger message="${region.key}" /></flow>',
      ),
    );
    expect(messages(run(cfg, projectRoot, { allowedKeys: ['region'] }))).toEqual([
      '"region.key" is missing from src/main/resources/config/eu/prod.yaml, so it does not resolve when mule.env=prod',
    ]);
  });

  it('CFG-004 accepts a key read both ways when plain and secure files both define it', () => {
    write('src/main/resources/app.yaml', 'shared:\n  key: "a"\n');
    write('src/main/resources/secure.yaml', 'shared:\n  key: "![b]"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="app.yaml" />\n<secure-properties:config name="s" file="secure.yaml" key="${k}" />\n<flow name="f"><logger message="${shared.key}" /><logger message="${secure::shared.key}" /></flow>',
      ),
    );
    expect(run(cfg, projectRoot)).toHaveLength(0);
  });

  it('CFG-004 reports only the side that does not resolve for a mixed key', () => {
    write('src/main/resources/secure.yaml', 'shared:\n  key: "![b]"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<secure-properties:config name="s" file="secure.yaml" key="${k}" />\n<flow name="f"><logger message="${secure::shared.key}" />\n<logger message="${shared.key}" /></flow>',
      ),
    );
    const issues = run(cfg, projectRoot);
    expect(issues.map((issue) => issue.line)).toEqual([4]);
    expect(issues[0]?.message).toBe(
      '"shared.key" is referenced both as ${shared.key} and as ${secure::shared.key}; ${shared.key} does not resolve because only a secure properties file defines it',
    );
  });

  it('CFG-004 reads placeholders inside CDATA but not inside comments', () => {
    write(
      'src/main/mule/app.xml',
      mule(
        '<flow name="f"><logger message="#[1]" /><!-- ${in.comment} --><ee:set-payload xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"><![CDATA[%dw 2.0\noutput json\n---\n{ k: p(\'in.cdata\') }]]></ee:set-payload></flow>',
      ),
    );
    expect(messages(run(cfg, projectRoot))).toEqual([
      '"in.cdata" is not defined in any file loaded by configuration-properties, a global-property, or mule-artifact.json secureProperties',
    ]);
  });

  describe('CFG-004 CloudHub reserved ports by deployment target', () => {
    const plugin = (
      deployments: string,
      wrap = (body: string) => `<build><plugins>${body}</plugins></build>`,
    ) => {
      write(
        'pom.xml',
        `<project>${wrap(`<plugin><artifactId>mule-maven-plugin</artifactId><configuration>${deployments}</configuration></plugin>`)}</project>`,
      );
    };
    const ports = () => {
      write(
        'src/main/mule/app.xml',
        mule(
          '<http:listener-config name="l"><http:listener-connection host="0.0.0.0" port="${http.port}" /></http:listener-config>\n<http:listener-config name="p"><http:listener-connection host="0.0.0.0" port="${https.private.port}" /></http:listener-config>',
        ),
      );
    };

    it.each([
      [
        'CloudHub',
        '<cloudHubDeployment><applicationName>a</applicationName></cloudHubDeployment>',
        0,
      ],
      ['CloudHub 2.0', '<cloudhub2Deployment><target>t</target></cloudhub2Deployment>', 0],
      ['both CloudHub targets', '<cloudHubDeployment/><cloudhub2Deployment/>', 0],
      [
        'Runtime Fabric',
        '<runtimeFabricDeployment><target>t</target></runtimeFabricDeployment>',
        2,
      ],
      [
        'standalone',
        '<standaloneDeployment><muleHome>/opt/mule</muleHome></standaloneDeployment>',
        2,
      ],
      ['Runtime Manager agent', '<agentDeployment/>', 2],
      ['CloudHub 2.0 and Runtime Fabric', '<cloudhub2Deployment/><runtimeFabricDeployment/>', 2],
      ['no deployment', '', 2],
    ])('%s pom.xml deployment gives %i port findings', (_name, deployments, count) => {
      ports();
      plugin(deployments);
      expect(run(cfg, projectRoot)).toHaveLength(count);
    });

    it('reads deployments declared in a profile', () => {
      ports();
      plugin(
        '<cloudhub2Deployment/>',
        (body) =>
          `<profiles><profile><build><plugins>${body}</plugins></build></profile></profiles>`,
      );
      expect(run(cfg, projectRoot)).toHaveLength(0);
    });

    it('lets the deploymentTarget option override inference both ways', () => {
      ports();
      plugin('<runtimeFabricDeployment/>');
      expect(run(cfg, projectRoot, { deploymentTarget: 'cloudhub2' })).toHaveLength(0);
      expect(run(cfg, projectRoot, { deploymentTarget: 'cloudhub' })).toHaveLength(0);
      plugin('<cloudhub2Deployment/>');
      expect(run(cfg, projectRoot, { deploymentTarget: 'rtf' })).toHaveLength(2);
      expect(run(cfg, projectRoot, { deploymentTarget: 'standalone' })).toHaveLength(2);
      expect(run(cfg, projectRoot, { deploymentTarget: 'not-a-target' })).toHaveLength(0);
    });

    it('names allowedKeys as the fix for other targets, and allowedKeys accepts them', () => {
      ports();
      plugin('<runtimeFabricDeployment/>');
      const issues = run(cfg, projectRoot);
      expect(issues[0]?.message).toBe(
        '"http.port" is not defined in any loaded file; CloudHub and CloudHub 2.0 supply it, but no CloudHub deployment target is declared (mule-maven-plugin or the "deploymentTarget" option); on other targets define it, or add it to "allowedKeys" if the target supplies it',
      );
      expect(
        run(cfg, projectRoot, { allowedKeys: ['http.port', 'https.private.port'] }),
      ).toHaveLength(0);
    });

    it('ignores deployment elements outside the mule-maven-plugin', () => {
      ports();
      write(
        'pom.xml',
        '<project><build><plugins><plugin><artifactId>other-plugin</artifactId><configuration><cloudhub2Deployment/></configuration></plugin></plugins></build></project>',
      );
      expect(run(cfg, projectRoot)).toHaveLength(2);
    });
  });

  const munit = new MUnitVersionParityRule();
  const munitPom = (plugin: string, runner: string, tools: string, extra = '') =>
    `<project><properties><java.version>17</java.version><anypoint.password>s3cr3t-value</anypoint.password></properties>${extra}<build><plugins><plugin><artifactId>munit-maven-plugin</artifactId>${plugin}</plugin></plugins></build><dependencies><dependency><artifactId>munit-runner</artifactId>${runner}</dependency><dependency><artifactId>munit-tools</artifactId>${tools}</dependency></dependencies></project>`;
  const v = (version: string) => `<version>${version}</version>`;

  it('TEST-002 never prints a resolved value that is not a version', () => {
    write('pom.xml', munitPom(v('3.1.0'), v('${anypoint.password}'), v('3.1.0')));
    const text = run(munit, projectRoot)
      .map((issue) => `${issue.message} ${issue.suggestion ?? ''}`)
      .join('\n');
    expect(text).not.toContain('s3cr3t-value');
  });

  it('TEST-002 compares qualifiers and uses Maven ordering for the Java 17 minimum', () => {
    write('pom.xml', munitPom(v('3.1.0'), v('3.1.0-SNAPSHOT'), v('3.1.0')));
    expect(messages(run(munit, projectRoot))).toEqual([
      'munit-runner version 3.1.0-SNAPSHOT differs from munit-maven-plugin version 3.1.0',
      'munit-runner version 3.1.0-SNAPSHOT does not support Java 17, which pom.xml java.version declares; MUnit 3.1.0 is the first release that does',
    ]);
    write('pom.xml', munitPom(v('3.1.0-rc1'), v('3.1.0-rc1'), v('3.1.0-rc1')));
    expect(run(munit, projectRoot)).toHaveLength(3);
    write('pom.xml', munitPom(v('3.1.0-1'), v('3.1.0-1'), v('3.1.0-1')));
    expect(run(munit, projectRoot)).toHaveLength(0);
  });

  it('TEST-002 reads versions from dependencyManagement and pluginManagement', () => {
    write(
      'pom.xml',
      munitPom(
        '',
        '',
        '',
        '<dependencyManagement><dependencies><dependency><artifactId>munit-runner</artifactId><version>3.0.0</version></dependency><dependency><artifactId>munit-tools</artifactId><version>3.1.0</version></dependency></dependencies></dependencyManagement><build><pluginManagement><plugins><plugin><artifactId>munit-maven-plugin</artifactId><version>3.1.0</version></plugin></plugins></pluginManagement></build>',
      ),
    );
    expect(messages(run(munit, projectRoot))).toContain(
      'munit-runner version 3.0.0 differs from munit-maven-plugin version 3.1.0',
    );
  });

  it('LOG-006 skips LOG-007-owned loggers only when LOG-007 is enabled', () => {
    write(
      'src/main/resources/log4j2.xml',
      '<Configuration><Loggers><AsyncLogger name="org.mule.extension.salesforce" level="DEBUG"/></Loggers></Configuration>',
    );
    const log006 = new ConnectorDebugLoggingRule();
    const withEnabled = (ids: string[]): ValidationContext => ({
      ...contextFor(projectRoot),
      projectContext: { hasHttpListener: false, hasApikitRouter: false, enabledRuleIds: ids },
    });
    expect(log006.runProject(withEnabled(['LOG-006']))).toHaveLength(1);
    expect(log006.runProject(withEnabled(['LOG-006', 'LOG-007']))).toHaveLength(0);
  });

  it('PROJ-003 and ERR-005 do not count test-scoped dependencies for src/main/mule', () => {
    write(
      'pom.xml',
      '<project><dependencies><dependency><artifactId>mule-db-connector</artifactId><scope>test</scope></dependency></dependencies></project>',
    );
    write(
      'src/main/mule/app.xml',
      mule(
        '<db:config name="d" /><error-handler><on-error-continue type="VM:QUEUE_TIMEOUT" /></error-handler>',
      ),
    );
    expect(run(new NamespaceDependencyRule(), projectRoot)).toHaveLength(1);
    write(
      'pom.xml',
      '<project><dependencies><dependency><artifactId>mule-vm-connector</artifactId><scope>test</scope></dependency></dependencies></project>',
    );
    expect(run(new UndefinedErrorTypeRule(), projectRoot)).toHaveLength(1);
  });

  it('maps the Cryptography module namespace to mule-cryptography-module', () => {
    const entry = MULE_MODULES.find((candidate) => candidate.errorNamespace === 'CRYPTO');
    expect(entry?.namespace).toBe('http://www.mulesoft.org/schema/mule/cryptography');
    expect(entry?.artifactIds).toEqual(['mule-cryptography-module']);
  });
});

describe('gate re-review fixes', () => {
  const cfg = new UnresolvedPropertyPlaceholderRule();
  const munit = new MUnitVersionParityRule();
  const leaked = (issues: Issue[]) =>
    issues.map((issue) => `${issue.message} ${issue.suggestion ?? ''}`).join('\n');

  it('TEST-002 suppresses a version resolved through a sensitive property at any depth', () => {
    write(
      'pom.xml',
      [
        '<project><properties>',
        '<java.version>17</java.version>',
        '<anypoint.password>3.0.0-hunter2</anypoint.password>',
        '<munit.version>${anypoint.password}</munit.version>',
        '<runner.version>${munit.version}</runner.version>',
        '</properties>',
        '<build><plugins><plugin><artifactId>munit-maven-plugin</artifactId><version>${munit.version}</version></plugin></plugins></build>',
        '<dependencies><dependency><artifactId>munit-runner</artifactId><version>${runner.version}</version></dependency>',
        '<dependency><artifactId>munit-tools</artifactId><version>3.1.0</version></dependency></dependencies>',
        '</project>',
      ].join(''),
    );
    expect(leaked(run(munit, projectRoot))).not.toContain('hunter2');
  });

  it('TEST-002 suppresses the munit.version fallback when it resolves through a secret', () => {
    write(
      'pom.xml',
      '<project><properties><api.token>3.0.0-hunter2</api.token><munit.version>${api.token}</munit.version></properties><build><plugins><plugin><artifactId>munit-maven-plugin</artifactId></plugin></plugins></build><dependencies><dependency><artifactId>munit-runner</artifactId><version>3.1.0</version></dependency></dependencies></project>',
    );
    expect(leaked(run(munit, projectRoot))).not.toContain('hunter2');
  });

  it('TEST-002 still judges a non-sensitive transitive version', () => {
    write(
      'pom.xml',
      '<project><properties><base.version>3.1.0</base.version><munit.version>${base.version}</munit.version></properties><build><plugins><plugin><artifactId>munit-maven-plugin</artifactId><version>${munit.version}</version></plugin></plugins></build><dependencies><dependency><artifactId>munit-runner</artifactId><version>3.2.0</version></dependency></dependencies></project>',
    );
    expect(run(munit, projectRoot).map((issue) => issue.message)).toEqual([
      'munit-runner version 3.2.0 differs from munit-maven-plugin version 3.1.0',
    ]);
  });

  it('TEST-002 compares every qualifier component', () => {
    write(
      'pom.xml',
      '<project><build><plugins><plugin><artifactId>munit-maven-plugin</artifactId><version>3.2.0-rc1-1</version></plugin></plugins></build><dependencies><dependency><artifactId>munit-runner</artifactId><version>3.2.0-rc1-2</version></dependency></dependencies></project>',
    );
    expect(run(munit, projectRoot)).toHaveLength(1);
  });

  it('CFG-004 checks combinations across independent patterned loads', () => {
    write('src/main/resources/env/dev.yaml', 'shared:\n  key: "a"\n');
    write('src/main/resources/env/prod.yaml', 'other: "b"\n');
    write('src/main/resources/region/eu.yaml', 'shared:\n  key: "c"\n');
    write('src/main/resources/region/us.yaml', 'other: "d"\n');
    write(
      'src/main/mule/app.xml',
      mule(
        '<configuration-properties file="env/${mule.env}.yaml" />\n<configuration-properties file="region/${region}.yaml" />\n<flow name="f"><logger message="${shared.key}" /></flow>',
      ),
    );
    expect(
      run(cfg, projectRoot, { allowedKeys: ['region'] }).map((issue) => issue.message),
    ).toEqual([
      '"shared.key" is missing from src/main/resources/env/prod.yaml, src/main/resources/region/us.yaml, so it does not resolve when mule.env=prod, region=us',
    ]);
  });

  it('CFG-004 reports when the combination check is limited', () => {
    const files: string[] = [];
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      for (const value of ['1', '2', '3']) {
        write(`src/main/resources/${name}/${value}.yaml`, `${name}${value}: "x"\n`);
      }
      files.push(`<configuration-properties file="${name}/\${${name}.sel}.yaml" />`);
    }
    write(
      'src/main/mule/app.xml',
      mule(`${files.join('\n')}\n<flow name="f"><logger message="\${a1}" /></flow>`),
    );
    const issues = run(cfg, projectRoot, { allowedPrefixes: ['a.', 'b.', 'c.', 'd.', 'e.'] });
    expect(issues.map((issue) => issue.message)).toEqual([
      'Environment combinations were not checked: the patterned configuration-properties loads select 243 combinations, more than the limit of 128',
    ]);
    expect(issues[0]?.severity).toBe('info');
  });
});
