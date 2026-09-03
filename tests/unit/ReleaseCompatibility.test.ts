import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';
import { format } from '../../src/formatters';
import { LintReport } from '../../src/types/Report';

/**
 * Rules introduced in 1.26.0. Disabling all of them must reproduce the
 * previous result exactly, which is what makes this release additive.
 */
const NEW_RULE_IDS = [
  'CFG-003',
  'SEC-011',
  'SEC-012',
  'SEC-013',
  'SEC-014',
  'SEC-015',
  'SEC-016',
  'API-009',
  'API-010',
  'API-011',
  'HTTP-005',
  'LOG-005',
  'PERF-003',
  'OPS-004',
  'RES-003',
  'MULE-805',
];

const SECRET = 'Summer2026-DoNotLeak';

let projectRoot: string;

const write = (relativePath: string, content: string): void => {
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-compat-'));
  fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
  fs.writeFileSync(
    path.join(projectRoot, 'pom.xml'),
    '<project><artifactId>demo</artifactId></project>',
  );

  write(
    'src/main/mule/app.xml',
    `<mule xmlns="http://www.mulesoft.org/schema/mule/core"
           xmlns:http="http://www.mulesoft.org/schema/mule/http"
           xmlns:batch="http://www.mulesoft.org/schema/mule/batch">
       <http:listener-config name="HTTP_Listener" basePath="/orders"/>
       <http:request-config name="Downstream">
         <http:request-connection protocol="HTTP" host="orders.example.com"/>
       </http:request-config>
       <batch:job jobName="import"/>
       <flow name="get-orders-flow">
         <http:listener config-ref="HTTP_Listener" path="/"/>
         <set-payload value="x"/>
       </flow>
     </mule>`,
  );
  write('src/main/resources/config/dev.properties', `db.password=${SECRET}\n`);
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

const scan = async (config = {}): Promise<LintReport> =>
  new LintEngine({ rules: ALL_RULES, config }).scan(projectRoot);

const ruleIdsOf = (report: LintReport): string[] =>
  report.files
    .flatMap((file) => file.issues)
    .map((issue) => issue.ruleId)
    .sort();

describe('1.26.0 release compatibility', () => {
  it('the new rules actually fire on a project that violates them', async () => {
    const fired = new Set(ruleIdsOf(await scan()));
    const firedNew = NEW_RULE_IDS.filter((id) => fired.has(id));
    expect(firedNew.length).toBeGreaterThan(0);
  });

  it('disabling every new rule reproduces the pre-release result', async () => {
    const rules = Object.fromEntries(NEW_RULE_IDS.map((id) => [id, { enabled: false }]));
    const disabled = await scan({ rules });

    for (const ruleId of ruleIdsOf(disabled)) {
      expect(NEW_RULE_IDS).not.toContain(ruleId);
    }
  });

  it('respects a severity override on a new rule', async () => {
    const report = await scan({
      rules: { 'SEC-012': { enabled: true, severity: 'info' } },
    });
    const issues = report.files
      .flatMap((file) => file.issues)
      .filter((issue) => issue.ruleId === 'SEC-012');

    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.severity).toBe('info');
    }
  });

  it('leaks no secret value into any output format', async () => {
    const report = await scan();
    for (const formatter of ['table', 'json', 'csv', 'sarif', 'html'] as const) {
      expect(format(report, formatter)).not.toContain(SECRET);
    }
  });

  it('attributes a properties finding to the real file in every format', async () => {
    const report = await scan();
    const expected = path.join('src/main/resources', 'config/dev.properties');

    const owner = report.files.find((file) =>
      file.issues.some((issue) => issue.ruleId === 'CFG-003'),
    );
    expect(owner?.relativePath).toBe(expected);

    const sarif = JSON.parse(format(report, 'sarif')) as {
      runs: {
        results: {
          ruleId: string;
          locations: { physicalLocation: { artifactLocation: { uri: string } } }[];
        }[];
      }[];
    };
    const result = sarif.runs[0]?.results.find((r) => r.ruleId === 'CFG-003');
    expect(result?.locations[0]?.physicalLocation.artifactLocation.uri).toBe(expected);
  });

  it('produces a deterministic report across repeated scans', async () => {
    const first = await scan();
    const second = await scan();
    expect(ruleIdsOf(second)).toEqual(ruleIdsOf(first));
    expect(format(second, 'csv')).toBe(format(first, 'csv'));
  });

  it('does not throw for a standalone snippet scan with no project context', () => {
    const engine = new LintEngine({ rules: ALL_RULES });
    expect(() =>
      engine.scanContent(
        '<mule xmlns="http://www.mulesoft.org/schema/mule/core"><flow name="f"><logger/></flow></mule>',
        'snippet.xml',
      ),
    ).not.toThrow();
  });
});
