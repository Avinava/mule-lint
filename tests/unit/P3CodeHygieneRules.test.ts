import { DuplicateTransformLogicRule } from '../../src/rules/dataweave/DuplicateTransformLogicRule';
import { UnusedVariableRule } from '../../src/rules/operations/UnusedVariableRule';
import { MissingEnvPropertiesDeclarationRule } from '../../src/rules/standards/MissingEnvPropertiesDeclarationRule';
import { ApikitRouteVariableConsistencyRule } from '../../src/rules/standards/ApikitRouteVariableConsistencyRule';
import { EventListenerNullGuardRule } from '../../src/rules/connector/EventListenerNullGuardRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('P3 Code Hygiene Rules', () => {
  const createContext = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
    filePath: 'test.xml',
    relativePath: 'test.xml',
    projectRoot: '/project',
    config: { enabled: true },
    ...overrides,
  });

  // =================================================================
  // DW-005: Duplicate Transform Logic
  // =================================================================
  describe('DuplicateTransformLogicRule (DW-005)', () => {
    const rule = new DuplicateTransformLogicRule();

    it('should pass when transforms have unique content', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="my-flow">
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- { id: payload.id }</ee:set-payload>
              </ee:message>
            </ee:transform>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- { name: payload.name }</ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag duplicate transform content', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="my-flow">
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- { id: payload.id, name: payload.name }</ee:set-payload>
              </ee:message>
            </ee:transform>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- { id: payload.id, name: payload.name }</ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('DW-005');
      expect(issues[0].message).toContain('Duplicate');
    });

    it('should skip short/trivial transforms', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="my-flow">
            <ee:transform>
              <ee:message>
                <ee:set-payload>payload</ee:set-payload>
              </ee:message>
            </ee:transform>
            <ee:transform>
              <ee:message>
                <ee:set-payload>payload</ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip externalized DWL references', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="my-flow">
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- readUrl("classpath://dw/transform.dwl")</ee:set-payload>
              </ee:message>
            </ee:transform>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- readUrl("classpath://dw/transform.dwl")</ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // HYG-005: Unused Variable
  // =================================================================
  describe('UnusedVariableRule (HYG-005)', () => {
    const rule = new UnusedVariableRule();

    it('should pass when variable is referenced in same flow', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="my-flow">
            <set-variable variableName="accountId" value="#[payload.id]"/>
            <logger message="#[vars.accountId]"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag variable not referenced in same flow', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="my-flow">
            <set-variable variableName="unusedVar" value="#[payload.id]"/>
            <logger message="hello world"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('HYG-005');
      expect(issues[0].message).toContain('unusedVar');
    });

    it('should skip well-known variables like httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="my-flow">
            <set-variable variableName="httpStatus" value="200"/>
            <logger message="done"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should detect reference via vars["name"] syntax', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="my-flow">
            <set-variable variableName="myVar" value="test"/>
            <logger message='#[vars["myVar"]]'/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should handle multiple unused variables', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="my-flow">
            <set-variable variableName="unused1" value="a"/>
            <set-variable variableName="unused2" value="b"/>
            <logger message="no vars used"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(2);
    });
  });

  // =================================================================
  // CFG-002: Missing Environment Properties Declaration
  // =================================================================
  describe('MissingEnvPropertiesDeclarationRule (CFG-002)', () => {
    const rule = new MissingEnvPropertiesDeclarationRule();

    it('should pass when dev and prod yaml files exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-cfg002-'));
      const resourceDir = path.join(tmpDir, 'src', 'main', 'resources');
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(path.join(resourceDir, 'dev.yaml'), 'test: true');
      fs.writeFileSync(path.join(resourceDir, 'prod.yaml'), 'test: true');

      rule.reset();
      const issues = rule.validate(
        null as unknown as Document,
        createContext({ projectRoot: tmpDir }),
      );
      expect(issues).toHaveLength(0);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should flag missing prod.yaml when dev.yaml exists', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-cfg002-'));
      const resourceDir = path.join(tmpDir, 'src', 'main', 'resources');
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(path.join(resourceDir, 'dev.yaml'), 'test: true');

      rule.reset();
      const issues = rule.validate(
        null as unknown as Document,
        createContext({ projectRoot: tmpDir }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('CFG-002');
      expect(issues[0].message).toContain('prod.yaml');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should flag missing secure env files', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-cfg002-'));
      const resourceDir = path.join(tmpDir, 'src', 'main', 'resources');
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(path.join(resourceDir, 'dev.yaml'), 'test: true');
      fs.writeFileSync(path.join(resourceDir, 'prod.yaml'), 'test: true');
      fs.writeFileSync(path.join(resourceDir, 'secure-dev.yaml'), 'secret: enc');

      rule.reset();
      const issues = rule.validate(
        null as unknown as Document,
        createContext({ projectRoot: tmpDir }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('secure-prod.yaml');

      fs.rmSync(tmpDir, { recursive: true });
    });

    it('should pass when no env-specific files exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-cfg002-'));
      const resourceDir = path.join(tmpDir, 'src', 'main', 'resources');
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(path.join(resourceDir, 'global.yaml'), 'app.name: test');

      rule.reset();
      const issues = rule.validate(
        null as unknown as Document,
        createContext({ projectRoot: tmpDir }),
      );
      expect(issues).toHaveLength(0);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  // =================================================================
  // STD-001: APIKit Route Variable Consistency
  // =================================================================
  describe('ApikitRouteVariableConsistencyRule (STD-001)', () => {
    const rule = new ApikitRouteVariableConsistencyRule();

    it('should pass when all APIKit flows consistently set httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="200"/>
          </flow>
          <flow name="post:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="201"/>
          </flow>
          <flow name="delete:\\accounts\\(id):api-config">
            <set-variable variableName="httpStatus" value="204"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should flag inconsistent flows where majority sets httpStatus', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="200"/>
          </flow>
          <flow name="post:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="201"/>
          </flow>
          <flow name="put:\\accounts\\(id):api-config">
            <set-variable variableName="httpStatus" value="200"/>
          </flow>
          <flow name="delete:\\accounts\\(id):api-config">
            <logger message="no httpStatus set here"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('STD-001');
      expect(issues[0].message).toContain('delete');
    });

    it('should skip when fewer than 3 APIKit flows exist', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get:\\accounts:api-config">
            <set-variable variableName="httpStatus" value="200"/>
          </flow>
          <flow name="post:\\accounts:api-config">
            <logger message="no status"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip non-APIKit flows', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="process-accounts">
            <set-variable variableName="httpStatus" value="200"/>
          </flow>
          <flow name="helper-flow">
            <logger message="no status"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });

  // =================================================================
  // SF-002: Event Listener Null Guard
  // =================================================================
  describe('EventListenerNullGuardRule (SF-002)', () => {
    const rule = new EventListenerNullGuardRule();

    it('should flag CDC flow with direct payload access without null safety', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <flow name="cdc-listener">
            <salesforce:subscribe-channel streamingChannel="/data/AccountChangeEvent"/>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0
                output application/json
                ---
                { accountName: payload.Name, accountId: payload.Id }
                </ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('SF-002');
      expect(issues[0].message).toContain('null-safety');
    });

    it('should pass when null-safe navigation is used', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <flow name="cdc-listener">
            <salesforce:replay-channel streamingChannel="/data/AccountChangeEvent"/>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0
                output application/json
                ---
                { accountName: payload?.Name default "", accountId: payload?.Id }
                </ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip flows without Salesforce event source', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
          <flow name="http-flow">
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0 output application/json --- { name: payload.name }</ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should pass when default operator is used', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <flow name="cdc-listener">
            <salesforce:subscribe-channel streamingChannel="/data/AccountChangeEvent"/>
            <ee:transform>
              <ee:message>
                <ee:set-payload>%dw 2.0
                output application/json
                ---
                { accountName: payload.Name default "N/A" }
                </ee:set-payload>
              </ee:message>
            </ee:transform>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });
  });
});
