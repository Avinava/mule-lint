import {
  FlowRefDepthRule,
  ConnectorConfigNamingRule,
  MUnitCoverageRule,
} from '../../src/rules/experimental/ExperimentalRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Experimental Rules', () => {
  const createContext = (filePath = 'test.xml'): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot: '/project',
    config: { enabled: true },
  });

  // =================================================================
  // EXP-001: Flow Reference Depth
  // =================================================================
  describe('FlowRefDepthRule (EXP-001)', () => {
    const rule = new FlowRefDepthRule();

    it('should pass for flow with few flow-refs', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="main-flow">
                        <flow-ref name="step-1"/>
                        <flow-ref name="step-2"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for flow with many flow-refs', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="complex-flow">
                        <flow-ref name="step-1"/>
                        <flow-ref name="step-2"/>
                        <flow-ref name="step-3"/>
                        <flow-ref name="step-4"/>
                        <flow-ref name="step-5"/>
                        <flow-ref name="step-6"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('EXP-001');
      expect(issues[0].message).toContain('6 flow-refs');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('EXP-001');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('experimental');
    });
  });

  // =================================================================
  // EXP-002: Connector Config Naming
  // =================================================================
  describe('ConnectorConfigNamingRule (EXP-002)', () => {
    const rule = new ConnectorConfigNamingRule();

    it('should pass for properly named configs', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="HTTP_Request_Config"/>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for incorrectly named configs', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="my-http-config"/>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('EXP-002');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('EXP-002');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('experimental');
    });
  });

  describe('MUnitCoverageRule (EXP-003)', () => {
    const projects: string[] = [];

    afterEach(() => {
      for (const project of projects.splice(0)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    });

    function projectContext(suite?: string): ValidationContext {
      const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-munit-'));
      projects.push(projectRoot);
      if (suite !== undefined) {
        const directory = path.join(projectRoot, 'src', 'test', 'munit');
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'suite.xml'), suite);
      }
      return {
        filePath: path.join(projectRoot, 'src', 'main', 'mule', 'app.xml'),
        relativePath: 'src/main/mule/app.xml',
        projectRoot,
        config: { enabled: true },
        allFlowNames: new Set(['main-flow']),
      };
    }

    function validate(suite?: string) {
      return new MUnitCoverageRule().runProject(projectContext(suite));
    }

    it('reports a project with flows and no test directory', () => {
      expect(validate()).toHaveLength(1);
    });

    it('reports empty, malformed, wrong-namespace, and ignored-only suites', () => {
      expect(validate('')).toHaveLength(1);
      expect(validate('<mule>')).toHaveLength(1);
      expect(validate('<mule><test name="wrong"/></mule>')).toHaveLength(1);
      expect(
        validate(`
          <mule xmlns:munit="http://www.mulesoft.org/schema/mule/munit">
            <munit:test name="ignored" ignore="TRUE"/>
          </mule>`),
      ).toHaveLength(1);
    });

    it('accepts a non-ignored test in the exact MUnit namespace', () => {
      expect(
        validate(`
          <mule xmlns:munit="http://www.mulesoft.org/schema/mule/munit">
            <munit:test name="behavior" ignore="false"/>
          </mule>`),
      ).toHaveLength(0);
    });

    it('does not follow a symlinked MUnit root', () => {
      const external = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-munit-external-'));
      projects.push(external);
      fs.writeFileSync(
        path.join(external, 'suite.xml'),
        '<mule xmlns:munit="http://www.mulesoft.org/schema/mule/munit"><munit:test name="outside"/></mule>',
      );
      const context = projectContext();
      const testRoot = path.join(context.projectRoot, 'src', 'test');
      fs.mkdirSync(testRoot, { recursive: true });
      fs.symlinkSync(external, path.join(testRoot, 'munit'), 'dir');
      expect(new MUnitCoverageRule().runProject(context)).toHaveLength(1);
    });

    it('does not report projects without production flows', () => {
      const context = projectContext();
      context.allFlowNames = new Set();
      expect(new MUnitCoverageRule().runProject(context)).toHaveLength(0);
    });

    it('exposes the compatible rule contract', () => {
      const rule = new MUnitCoverageRule();
      expect(rule.id).toBe('EXP-003');
      expect(rule.name).toBe('MUnit Executable Test Presence');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('experimental');
    });
  });
});
