import { MissingErrorHandlerRule } from '../../src/rules/error-handling/MissingErrorHandlerRule';
import { GenericErrorRule } from '../../src/rules/error-handling/GenericErrorRule';
import { HttpStatusRule } from '../../src/rules/error-handling/HttpStatusRule';
import { CorrelationIdRule } from '../../src/rules/error-handling/CorrelationIdRule';
import { GlobalErrorHandlerRule } from '../../src/rules/error-handling/GlobalErrorHandlerRule';
import { TryScopeRule } from '../../src/rules/error-handling/TryScopeRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Error Handling Rules', () => {
  const createContext = (filePath = 'test.xml', projectRoot = '/project'): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot,
    config: { enabled: true },
  });

  // =================================================================
  // MULE-003: Missing Error Handler
  // =================================================================
  describe('MissingErrorHandlerRule (MULE-003)', () => {
    const rule = new MissingErrorHandlerRule();

    it('should pass for flow with inline error handler', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-process-flow">
                        <logger message="test"/>
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for flow without error handler', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="my-process-flow">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-003');
      expect(issues[0].message).toContain('my-process-flow');
    });

    it('should skip APIKit auto-generated flows', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="get:\\health:api-config">
                        <logger message="test"/>
                    </flow>
                    <flow name="post:\\orders:api-config">
                        <logger message="test"/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip *-api-main flows', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="orders-api-main">
                        <apikit:router/>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-003');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // MULE-009: Generic Error Type
  // =================================================================
  describe('GenericErrorRule (MULE-009)', () => {
    const rule = new GenericErrorRule();

    it('should pass for specific error types', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue type="HTTP:CONNECTIVITY">
                                <logger message="error"/>
                            </on-error-continue>
                            <on-error-propagate type="VALIDATION:INVALID_JSON">
                                <logger message="error"/>
                            </on-error-propagate>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for type="ANY" in on-error-continue', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue type="ANY">
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-009');
      expect(issues[0].message).toContain('ANY');
    });

    it('should fail for type="MULE:ANY" in on-error-propagate', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-propagate type="MULE:ANY">
                                <logger message="error"/>
                            </on-error-propagate>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('MULE:ANY');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-009');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // MULE-005: HTTP Status in Error Handler
  // =================================================================
  describe('HttpStatusRule (MULE-005)', () => {
    const rule = new HttpStatusRule();

    it('should pass when httpStatus variable is set', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <set-variable variableName="httpStatus" value="500"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail when httpStatus is not set in error handler', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-005');
      expect(issues[0].message).toContain('httpStatus');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-005');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('error-handling');
    });

    it('should skip check for non-HTTP project (no listener, no apikitRouter)', () => {
      // Same XML that would normally trigger a warning
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="batch-process-flow">
            <error-handler>
              <on-error-continue>
                <logger message="error"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      // projectContext explicitly says no HTTP — rule should skip
      const ctx = {
        ...createContext(),
        projectContext: { hasHttpListener: false, hasApikitRouter: false },
      };
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(0);
    });

    it('should still report for HTTP project missing httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-flow">
            <error-handler>
              <on-error-continue>
                <logger message="error"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      // projectContext says HTTP is present — rule should still fire
      const ctx = {
        ...createContext(),
        projectContext: { hasHttpListener: true, hasApikitRouter: false },
      };
      const issues = rule.validate(result.document!, ctx);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-005');
    });

    it('should report when projectContext is absent (backward compat / standalone scan)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="test-flow">
            <error-handler>
              <on-error-continue>
                <logger message="error"/>
              </on-error-continue>
            </error-handler>
          </flow>
        </mule>
      `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      // No projectContext at all (standalone scan) — rule falls back to reporting
      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
    });
  });

  // =================================================================
  // MULE-007: Correlation ID in Error Handler
  // =================================================================
  describe('CorrelationIdRule (MULE-007)', () => {
    const rule = new CorrelationIdRule();
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-007-'));
      const dwlDir = path.join(tmpDir, 'src', 'main', 'resources', 'dwl', 'transforms');
      fs.mkdirSync(dwlDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should pass when correlationId is referenced inline', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <ee:transform>
                                    <ee:set-payload><![CDATA[%dw 2.0
                                    output application/json
                                    ---
                                    {correlationId: correlationId}
                                    ]]></ee:set-payload>
                                </ee:transform>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when correlationId is in a resource-referenced DWL file', () => {
      // Write a DWL file that contains correlationId
      const dwlPath = path.join(
        tmpDir,
        'src',
        'main',
        'resources',
        'dwl',
        'transforms',
        'error-payload.dwl',
      );
      fs.writeFileSync(
        dwlPath,
        `%dw 2.0
output application/json
---
{
    correlationId: vars.correlationId default "",
    message: error.detailedDescription default ""
}`,
      );

      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <error-handler name="global-error-handler">
                        <on-error-propagate type="ANY">
                            <ee:transform>
                                <ee:message>
                                    <ee:set-payload resource="dwl/transforms/error-payload.dwl"/>
                                </ee:message>
                            </ee:transform>
                        </on-error-propagate>
                    </error-handler>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));
      expect(issues).toHaveLength(0);
    });

    it('should downgrade to info when resource file exists but has no correlationId', () => {
      // DWL file exists but doesn't include correlationId
      const dwlPath = path.join(
        tmpDir,
        'src',
        'main',
        'resources',
        'dwl',
        'transforms',
        'error-payload.dwl',
      );
      fs.writeFileSync(
        dwlPath,
        `%dw 2.0
output application/json
---
{
    message: error.detailedDescription default ""
}`,
      );

      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <error-handler name="global-error-handler">
                        <on-error-propagate type="ANY">
                            <ee:transform>
                                <ee:message>
                                    <ee:set-payload resource="dwl/transforms/error-payload.dwl"/>
                                </ee:message>
                            </ee:transform>
                        </on-error-propagate>
                    </error-handler>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-007');
      // Should still flag it, but as warning (inline path, file found but no correlationId)
    });

    it('should downgrade to info when resource file cannot be read', () => {
      // Resource= attribute present but points to a non-existent file
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                    <error-handler name="global-error-handler">
                        <on-error-propagate type="ANY">
                            <ee:transform>
                                <ee:message>
                                    <ee:set-payload resource="dwl/transforms/nonexistent.dwl"/>
                                </ee:message>
                            </ee:transform>
                        </on-error-propagate>
                    </error-handler>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext('test.xml', tmpDir));
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-007');
      expect(issues[0].severity).toBe('info');
      expect(issues[0].message).toContain('external DWL file');
    });

    it('should fail when correlationId is not referenced and no resource references exist', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <error-handler>
                            <on-error-continue>
                                <logger message="error"/>
                            </on-error-continue>
                        </error-handler>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('MULE-007');
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('correlationId');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-007');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // ERR-001: Try Scope Best Practice
  // =================================================================
  describe('TryScopeRule (ERR-001)', () => {
    const rule = new TryScopeRule();

    it('should pass for flow with Try scope', () => {
      const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http"
                      xmlns:db="http://www.mulesoft.org/schema/mule/db">
                    <flow name="test-flow">
                        <try>
                            <http:request config-ref="HTTP"/>
                            <db:select config-ref="DB"/>
                        </try>
                    </flow>
                </mule>
            `;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('ERR-001');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('error-handling');
    });
  });

  // =================================================================
  // MULE-001: Global Error Handler Exists (ProjectRule — runs once per scan)
  // =================================================================
  describe('GlobalErrorHandlerRule (MULE-001)', () => {
    let rule: GlobalErrorHandlerRule;

    beforeEach(() => {
      rule = new GlobalErrorHandlerRule();
    });

    it('should pass when an XML file contains a named error-handler element', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-001-'));
      try {
        const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
        fs.mkdirSync(muleDir, { recursive: true });
        // error-handling.xml contains <error-handler name="global-error-handler">
        fs.writeFileSync(
          path.join(muleDir, 'error-handling.xml'),
          `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
            <error-handler name="global-error-handler">
              <on-error-continue><logger message="error"/></on-error-continue>
            </error-handler>
          </mule>`,
        );

        const issues = rule.validate(
          {} as Document,
          createContext('src/main/mule/api.xml', tmpDir),
        );
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should pass when an XML file contains an error-handler with ref attribute', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-001-'));
      try {
        const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
        fs.mkdirSync(muleDir, { recursive: true });
        fs.writeFileSync(
          path.join(muleDir, 'api.xml'),
          `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
            <flow name="my-flow">
              <logger message="test"/>
              <error-handler ref="global-error-handler"/>
            </flow>
          </mule>`,
        );

        const issues = rule.validate(
          {} as Document,
          createContext('src/main/mule/api.xml', tmpDir),
        );
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should report warning when no error handler found anywhere in project', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-001-'));
      try {
        const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
        fs.mkdirSync(muleDir, { recursive: true });
        // Flow file without any error handler reference
        fs.writeFileSync(
          path.join(muleDir, 'my-flow.xml'),
          `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
            <flow name="my-process-flow"><logger message="test"/></flow>
          </mule>`,
        );

        const issues = rule.validate(
          {} as Document,
          createContext('src/main/mule/my-flow.xml', tmpDir),
        );
        expect(issues).toHaveLength(1);
        expect(issues[0].ruleId).toBe('MULE-001');
        expect(issues[0].severity).toBe('warning');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should pass when the expected global error handler file exists on disk', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-001-'));
      try {
        const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
        fs.mkdirSync(muleDir, { recursive: true });
        fs.writeFileSync(path.join(muleDir, 'global-error-handler.xml'), '<mule/>');

        const issues = rule.validate(
          {} as Document,
          createContext('src/main/mule/my-flow.xml', tmpDir),
        );
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should find error-handler in subdirectories of src/main/mule', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-001-'));
      try {
        const commonDir = path.join(tmpDir, 'src', 'main', 'mule', 'common');
        fs.mkdirSync(commonDir, { recursive: true });
        // Error handler in a subdirectory (common pattern in accelerator projects)
        fs.writeFileSync(
          path.join(commonDir, 'error-handling.xml'),
          `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
            <error-handler name="global-error-handler">
              <on-error-continue><logger message="error"/></on-error-continue>
            </error-handler>
          </mule>`,
        );

        const issues = rule.validate(
          {} as Document,
          createContext('src/main/mule/api.xml', tmpDir),
        );
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should only run once per scan (ProjectRule)', () => {
      // First call should produce an issue
      const issues1 = rule.validate(
        {} as Document,
        createContext('src/main/mule/a.xml', '/nonexistent-project'),
      );
      expect(issues1).toHaveLength(1);

      // Second call should return empty (already ran)
      const issues2 = rule.validate(
        {} as Document,
        createContext('src/main/mule/b.xml', '/nonexistent-project'),
      );
      expect(issues2).toHaveLength(0);

      // After reset, should run again
      rule.reset();
      const issues3 = rule.validate(
        {} as Document,
        createContext('src/main/mule/c.xml', '/nonexistent-project'),
      );
      expect(issues3).toHaveLength(1);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('MULE-001');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('error-handling');
    });
  });
});
