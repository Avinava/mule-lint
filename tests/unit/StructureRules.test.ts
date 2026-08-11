import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MonolithicXmlRule, ProjectStructureRule } from '../../src/rules/structure/StructureRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Structure Rules', () => {
  const createContext = (filePath = 'test.xml', projectRoot = '/project'): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot,
    config: { enabled: true },
  });

  // =================================================================
  // MULE-802: Project Structure Validation
  // =================================================================
  describe('ProjectStructureRule (MULE-802)', () => {
    const rule = new ProjectStructureRule();

    beforeEach(() => {
      rule.reset();
    });

    /** Convenience: create the minimum required structure */
    const createRequiredDirs = (base: string): void => {
      fs.mkdirSync(path.join(base, 'src', 'main', 'mule'), { recursive: true });
      fs.mkdirSync(path.join(base, 'src', 'main', 'resources'), { recursive: true });
    };

    it('should pass when required and default recommended dirs exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-802-'));
      try {
        createRequiredDirs(tmpDir);
        fs.mkdirSync(path.join(tmpDir, 'src', 'main', 'resources', 'dwl'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'src', 'test', 'munit'), { recursive: true });

        // pass an empty XML doc — rule uses filesystem not doc
        const result = parseXml('<mule/>');
        const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should report error for missing required directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-802-'));
      try {
        // Only create resources, not mule
        fs.mkdirSync(path.join(tmpDir, 'src', 'main', 'resources'), { recursive: true });

        const result = parseXml('<mule/>');
        const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));

        const errors = issues.filter((i) => i.severity === 'error');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((i) => i.message.includes('src/main/mule'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should NOT flag src/main/resources/api as missing by default (MULE-802 fix)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-802-'));
      try {
        createRequiredDirs(tmpDir);
        // Deliberately do NOT create resources/api
        fs.mkdirSync(path.join(tmpDir, 'src', 'main', 'resources', 'dwl'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'src', 'test', 'munit'), { recursive: true });

        const result = parseXml('<mule/>');
        const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));

        // No issue about api/ directory
        expect(issues.every((i) => !i.message.includes('resources/api'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should include src/main/resources/api when explicitly configured', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-802-'));
      try {
        createRequiredDirs(tmpDir);
        // api/ intentionally missing

        const result = parseXml('<mule/>');
        const ctx: ValidationContext = {
          filePath: 'test.xml',
          relativePath: 'test.xml',
          projectRoot: tmpDir,
          config: {
            enabled: true,
            options: {
              recommendedDirs: [
                'src/main/resources/dwl',
                'src/main/resources/api',
                'src/test/munit',
              ],
            },
          },
        };
        const issues = rule.validate(result.document!, ctx);
        const apiIssue = issues.find((i) => i.message.includes('resources/api'));
        expect(apiIssue).toBeDefined();
        expect(apiIssue!.severity).toBe('info');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-802');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('structure');
    });
  });

  // =================================================================
  // MULE-804: Monolithic XML File
  // =================================================================
  describe('MonolithicXmlRule (MULE-804)', () => {
    const rule = new MonolithicXmlRule();

    it('should pass for file with few flows', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="flow-1"><logger/></flow>
                    <flow name="flow-2"><logger/></flow>
                    <sub-flow name="sub-1"><logger/></sub-flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for file with many flows', () => {
      const flows = Array.from(
        { length: 12 },
        (_, i) => `<flow name="flow-${i + 1}"><logger/></flow>`,
      ).join('\n');

      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    ${flows}
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-804');
      expect(issues[0].message).toContain('12 flows');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-804');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('structure');
    });
  });
});
