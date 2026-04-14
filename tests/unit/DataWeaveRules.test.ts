import {
  ExternalDwlRule,
  DwlNamingRule,
  DwlModulesRule,
} from '../../src/rules/dataweave/DataWeaveRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DataWeave Rules', () => {
  const createContext = (
    filePath = 'src/main/mule/test.xml',
    options?: Record<string, unknown>,
  ): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot: '/project',
    config: { enabled: true, options },
  });

  // =================================================================
  // DW-001: External DWL for Complex Transforms
  // =================================================================
  describe('ExternalDwlRule (DW-001)', () => {
    const rule = new ExternalDwlRule();

    it('should pass for small inline transforms', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <ee:transform doc:name="Small Transform">
                            <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{id: payload.id}
]]></ee:set-payload>
                        </ee:transform>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for large inline transforms', () => {
      // Generate a transform with more than 10 lines
      const bigTransform = `%dw 2.0
output application/json
var line1 = "test"
var line2 = "test"
var line3 = "test"
var line4 = "test"
var line5 = "test"
var line6 = "test"
var line7 = "test"
var line8 = "test"
var line9 = "test"
var line10 = "test"
var line11 = "test"
---
{result: line1}`;

      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <ee:transform doc:name="Big Transform">
                            <ee:set-payload><![CDATA[${bigTransform}]]></ee:set-payload>
                        </ee:transform>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('DW-001');
      expect(issues[0].message).toContain('externalize');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('DW-001');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('dataweave');
    });
  });

  // =================================================================
  // DW-002: DWL File Naming Convention
  // =================================================================
  describe('DwlNamingRule (DW-002)', () => {
    const rule = new DwlNamingRule();
    let tmpDir: string;

    beforeEach(() => {
      // Create a real temp directory with DWL files for filesystem-based tests
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-dw002-'));
      const dwlDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl');
      const lookupsDir = path.join(dwlDir, 'lookups');
      const transformsDir = path.join(dwlDir, 'transforms');
      fs.mkdirSync(lookupsDir, { recursive: true });
      fs.mkdirSync(transformsDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const createFsContext = (options?: Record<string, unknown>): ValidationContext => ({
      filePath: path.join(tmpDir, 'src/main/mule/test.xml'),
      relativePath: 'src/main/mule/test.xml',
      projectRoot: tmpDir,
      config: { enabled: true, options },
    });

    it('should flag camelCase file under default kebab-case convention', () => {
      const dwlDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'transforms');
      fs.writeFileSync(path.join(dwlDir, 'errorPayload.dwl'), '%dw 2.0\n---\n{}');

      const issues = rule.validate({} as Document, createFsContext());
      expect(issues.length).toBe(1);
      expect(issues[0].ruleId).toBe('DW-002');
      expect(issues[0].message).toContain('errorPayload.dwl');
    });

    it('should pass for kebab-case file under default convention', () => {
      const dwlDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'transforms');
      fs.writeFileSync(path.join(dwlDir, 'error-payload.dwl'), '%dw 2.0\n---\n{}');

      const issues = rule.validate({} as Document, createFsContext());
      expect(issues.length).toBe(0);
    });

    it('should exempt camelCase DW module files when exemptPaths is configured', () => {
      // DataWeave module import requires the filename to match the module identifier.
      // Module identifiers cannot contain hyphens, so countryMap.dwl MUST be camelCase
      // to be importable as: import countryMap from dwl::lookups::countryMap
      const lookupsDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'lookups');
      fs.writeFileSync(path.join(lookupsDir, 'countryMap.dwl'), '%dw 2.0\n---\n{}');
      fs.writeFileSync(path.join(lookupsDir, 'currencyMap.dwl'), '%dw 2.0\n---\n{}');

      const issues = rule.validate(
        {} as Document,
        createFsContext({
          exemptPaths: ['src/main/resources/dwl/lookups/**'],
        }),
      );
      expect(issues.length).toBe(0);
    });

    it('should still flag non-exempt files even when exemptPaths is set', () => {
      const lookupsDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'lookups');
      const transformsDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'transforms');
      fs.writeFileSync(path.join(lookupsDir, 'countryMap.dwl'), '%dw 2.0\n---\n{}');
      // This file is NOT in the exempt path, so it should still be flagged
      fs.writeFileSync(path.join(transformsDir, 'errorPayload.dwl'), '%dw 2.0\n---\n{}');

      const issues = rule.validate(
        {} as Document,
        createFsContext({
          exemptPaths: ['src/main/resources/dwl/lookups/**'],
        }),
      );
      // countryMap is exempt; errorPayload is not → 1 issue for errorPayload
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain('errorPayload.dwl');
    });

    it('should pass all files when convention is "any"', () => {
      const lookupsDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'lookups');
      fs.writeFileSync(path.join(lookupsDir, 'countryMap.dwl'), '%dw 2.0\n---\n{}');
      fs.writeFileSync(path.join(lookupsDir, 'country-map.dwl'), '%dw 2.0\n---\n{}');
      fs.writeFileSync(path.join(lookupsDir, 'country_map.dwl'), '%dw 2.0\n---\n{}');

      const issues = rule.validate({} as Document, createFsContext({ convention: 'any' }));
      expect(issues.length).toBe(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('DW-002');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('dataweave');
    });

    it('should have configurable convention support', () => {
      expect(rule.description).toContain('kebab-case');
    });
  });

  // =================================================================
  // DW-003: DWL Modules Usage
  // =================================================================
  describe('DwlModulesRule (DW-003)', () => {
    const rule = new DwlModulesRule();

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('DW-003');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('dataweave');
    });
  });
});
