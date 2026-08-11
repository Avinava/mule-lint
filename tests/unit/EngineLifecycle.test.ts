import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LintEngine } from '../../src/engine/LintEngine';
import {
  ApiKitValidationRule,
  AutoDiscoveryRule,
  Java17DWErrorHandlingRule,
  ProjectStructureRule,
} from '../../src/rules';

const MULE_ROOT = 'http://www.mulesoft.org/schema/mule/core';

function writeXml(projectRoot: string, name: string, body: string): void {
  const muleDir = path.join(projectRoot, 'src/main/mule');
  fs.mkdirSync(muleDir, { recursive: true });
  fs.writeFileSync(path.join(muleDir, name), body);
}

describe('project rule lifecycle', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lifecycle-'));
    fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('runs project findings once and excludes their virtual result from file totals', async () => {
    writeXml(projectRoot, 'one.xml', `<mule xmlns="${MULE_ROOT}"/>`);
    writeXml(projectRoot, 'two.xml', `<mule xmlns="${MULE_ROOT}"/>`);
    fs.rmSync(path.join(projectRoot, 'src/main/resources'), { recursive: true, force: true });

    const engine = new LintEngine({ rules: [new ProjectStructureRule()] });
    const report = await engine.scan(projectRoot);
    const structureIssues = report.files.flatMap((file) => file.issues);

    expect(report.summary.totalFiles).toBe(2);
    expect(report.summary.filesWithIssues).toBe(0);
    expect(
      structureIssues.filter(
        (issue) => issue.message === 'Missing required directory: src/main/resources',
      ),
    ).toHaveLength(1);
  });

  it('applies project severity overrides and refreshes filesystem state across scans', async () => {
    writeXml(projectRoot, 'one.xml', `<mule xmlns="${MULE_ROOT}"/>`);
    const engine = new LintEngine({
      rules: [new ProjectStructureRule()],
      config: { rules: { 'MULE-802': { enabled: true, severity: 'warning' } } },
    });

    const first = await engine.scan(projectRoot);
    expect(
      first.files.flatMap((file) => file.issues).every((issue) => issue.severity === 'warning'),
    ).toBe(true);

    fs.mkdirSync(path.join(projectRoot, 'src/main/resources/dwl'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, 'src/test/munit'), { recursive: true });
    const second = await engine.scan(projectRoot);
    expect(second.files.flatMap((file) => file.issues)).toHaveLength(0);
  });

  it('uses project-wide APIKit and autodiscovery context', async () => {
    writeXml(
      projectRoot,
      'main.xml',
      `<mule xmlns="${MULE_ROOT}" xmlns:http="http://www.mulesoft.org/schema/mule/http">
        <flow name="orders-api-main"><http:listener config-ref="HTTP" path="/api"/></flow>
      </mule>`,
    );
    writeXml(
      projectRoot,
      'global.xml',
      `<mule xmlns="${MULE_ROOT}"
        xmlns:apikit="http://www.mulesoft.org/schema/mule/apikit"
        xmlns:api-gateway="http://www.mulesoft.org/schema/mule/api-gateway">
        <apikit:config name="orders-api-config" api="orders.raml"/>
        <apikit:router config-ref="orders-api-config"/>
        <api-gateway:autodiscovery apiId="\${api.id}" flowRef="orders-api-main"/>
      </mule>`,
    );

    const engine = new LintEngine({
      rules: [new ApiKitValidationRule(), new AutoDiscoveryRule()],
    });
    const report = await engine.scan(projectRoot);
    expect(report.files.flatMap((file) => file.issues)).toHaveLength(0);
  });

  it('scans external DataWeave once while retaining inline checks per file', async () => {
    writeXml(
      projectRoot,
      'one.xml',
      `<mule xmlns="${MULE_ROOT}" xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
        <flow name="one"><ee:set-payload>#[error.description]</ee:set-payload></flow>
      </mule>`,
    );
    writeXml(projectRoot, 'two.xml', `<mule xmlns="${MULE_ROOT}"/>`);
    const resources = path.join(projectRoot, 'src/main/resources/dwl');
    fs.mkdirSync(resources, { recursive: true });
    fs.writeFileSync(path.join(resources, 'errors.dwl'), '%dw 2.0\n---\nerror.errors');

    const engine = new LintEngine({ rules: [new Java17DWErrorHandlingRule()] });
    const report = await engine.scan(projectRoot);
    const issues = report.files.flatMap((file) => file.issues);

    expect(issues.filter((issue) => issue.message.includes('errors.dwl'))).toHaveLength(1);
    expect(issues.filter((issue) => issue.message.includes('error.description'))).toHaveLength(1);
  });
});
