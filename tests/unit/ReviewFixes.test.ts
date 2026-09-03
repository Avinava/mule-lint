import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';
import { ApiSpecificationPresentRule } from '../../src/rules/api-led/ApiSpecificationPresentRule';
import { MessagingIdempotencyRule } from '../../src/rules/operations/MessagingIdempotencyRule';
import { PlaintextPropertiesSecretsRule } from '../../src/rules/standards/PlaintextPropertiesSecretsRule';
import { loadCustomXPathRules } from '../../src/core/CustomRuleLoader';
import { filterReportBySeverity } from '../../src/core/ReportFilter';

let projectRoot: string;

const write = (relativePath: string, content: string): void => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const MULE = (body: string): string =>
  `<mule xmlns="http://www.mulesoft.org/schema/mule/core"
         xmlns:http="http://www.mulesoft.org/schema/mule/http"
         xmlns:jms="http://www.mulesoft.org/schema/mule/jms">${body}</mule>`;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-review-'));
  fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe('API-009 dependency evidence', () => {
  const scan = async () =>
    new LintEngine({ rules: [new ApiSpecificationPresentRule()] }).scan(projectRoot);

  const withPom = (deps: string): void => {
    write(
      'pom.xml',
      `<project><artifactId>orders-api</artifactId>
         <build><plugins><plugin><artifactId>mule-maven-plugin</artifactId></plugin></plugins></build>
         <dependencies>${deps}</dependencies>
       </project>`,
    );
    write(
      'src/main/mule/api.xml',
      MULE('<flow name="f"><http:listener config-ref="L" path="/x"/></flow>'),
    );
  };

  it('does not treat the project’s own artifactId as a contract dependency', async () => {
    // The project is named orders-api; that is not evidence it depends on a
    // published API contract.
    withPom('<dependency><artifactId>commons-lang3</artifactId></dependency>');
    write('.mulelintrc.json', '{}');

    const engine = new LintEngine({
      rules: [new ApiSpecificationPresentRule()],
      config: {
        rules: { 'API-009': { enabled: true, options: { allowExchangeDependency: true } } },
      },
    });
    const report = await engine.scan(projectRoot);
    expect(report.files.flatMap((f) => f.issues)).toHaveLength(1);
  });

  it('accepts a real API contract dependency when allowed', async () => {
    withPom('<dependency><artifactId>orders-api-spec</artifactId></dependency>');
    const engine = new LintEngine({
      rules: [new ApiSpecificationPresentRule()],
      config: {
        rules: { 'API-009': { enabled: true, options: { allowExchangeDependency: true } } },
      },
    });
    const report = await engine.scan(projectRoot);
    expect(report.files.flatMap((f) => f.issues)).toHaveLength(0);
  });

  it('reports when there is no specification at all', async () => {
    withPom('<dependency><artifactId>commons-lang3</artifactId></dependency>');
    const report = await scan();
    expect(report.files.flatMap((f) => f.issues)).toHaveLength(1);
  });
});

describe('RES-003 applies to messaging consumers', () => {
  const scan = async () =>
    (await new LintEngine({ rules: [new MessagingIdempotencyRule()] }).scan(projectRoot)).files
      .flatMap((f) => f.issues)
      .filter((i) => i.ruleId === 'RES-003');

  it('does not fire for a publisher-only project', async () => {
    // Publishing cannot receive a duplicate, so there is nothing to deduplicate.
    write(
      'src/main/mule/app.xml',
      MULE('<flow name="f"><jms:publish config-ref="JMS" destination="q"/></flow>'),
    );
    expect(await scan()).toHaveLength(0);
  });

  it('does not fire for a bare connector configuration', async () => {
    write('src/main/mule/app.xml', MULE('<jms:config name="JMS"/>'));
    expect(await scan()).toHaveLength(0);
  });

  it('fires for a consumer with no idempotency evidence', async () => {
    write(
      'src/main/mule/app.xml',
      MULE('<flow name="f"><jms:listener config-ref="JMS" destination="q"/><logger/></flow>'),
    );
    expect(await scan()).toHaveLength(1);
  });

  it('passes a consumer with an idempotent message validator', async () => {
    write(
      'src/main/mule/app.xml',
      MULE(
        '<flow name="f"><jms:listener config-ref="JMS" destination="q"/><idempotent-message-validator idExpression="#[1]"/></flow>',
      ),
    );
    expect(await scan()).toHaveLength(0);
  });
});

describe('custom rules and quiet mode', () => {
  const CUSTOM = `rules:
  - id: ACME-001
    name: Standard flow error handler
    description: Organization flows must declare an error handler.
    category: governance
    severity: error
    xpath: //mule:flow[not(mule:error-handler)]
    message: 'Flow "{name}" has no error handler.'
`;

  it('keeps custom findings out of the rating after severity filtering', async () => {
    write('src/main/mule/app.xml', MULE('<flow name="nh"><logger/></flow>'));
    write('custom.yaml', CUSTOM);

    const custom = loadCustomXPathRules(
      path.join(projectRoot, 'custom.yaml'),
      ALL_RULES.map((rule) => rule.id),
    );
    const rules = [...ALL_RULES, ...custom];
    const report = await new LintEngine({ rules }).scan(projectRoot);
    const customIds = new Set(custom.map((rule) => rule.id));

    const filtered = filterReportBySeverity(report, new Set(['error']), rules, customIds);
    const withoutExclusions = filterReportBySeverity(report, new Set(['error']), rules);

    // Quiet mode changes presentation, not the rating basis.
    expect(filtered.metrics?.maintainability?.technicalDebtMinutes).toBeLessThan(
      withoutExclusions.metrics?.maintainability?.technicalDebtMinutes ?? 0,
    );
  });
});

describe('summary counts stay consistent with severity filtering', () => {
  it('counts the same files before and after filtering when nothing is removed', async () => {
    write('src/main/mule/app.xml', MULE('<flow name="nh"><logger/></flow>'));
    write('src/main/resources/config/dev.properties', 'db.password=literal-value');

    const rules = [new PlaintextPropertiesSecretsRule()];
    const report = await new LintEngine({ rules }).scan(projectRoot);
    const filtered = filterReportBySeverity(report, new Set(['error']), rules);

    expect(filtered.summary.filesWithIssues).toBe(report.summary.filesWithIssues);
    expect(filtered.summary.filesWithIssues).toBeLessThanOrEqual(filtered.summary.totalFiles);
  });
});
