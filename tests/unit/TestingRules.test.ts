import { MUnitTestPresenceRule } from '../../src/rules/testing/MUnitTestPresenceRule';
import { ValidationContext } from '../../src/types';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Testing Rules', () => {
  describe('MUnitTestPresenceRule (TEST-001)', () => {
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
      return new MUnitTestPresenceRule().runProject(projectContext(suite));
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
      expect(new MUnitTestPresenceRule().runProject(context)).toHaveLength(1);
    });

    it('skips library projects', () => {
      const context = projectContext();
      context.projectContext = {
        hasHttpListener: false,
        hasApikitRouter: false,
        projectLayer: 'library',
      };
      expect(new MUnitTestPresenceRule().runProject(context)).toHaveLength(0);
    });

    it('does not report projects without production flows', () => {
      const context = projectContext();
      context.allFlowNames = new Set();
      expect(new MUnitTestPresenceRule().runProject(context)).toHaveLength(0);
    });

    it('exposes the compatible rule contract', () => {
      const rule = new MUnitTestPresenceRule();
      expect(rule.id).toBe('TEST-001');
      expect(rule.name).toBe('MUnit Executable Test Presence');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('testing');
    });
  });
});
