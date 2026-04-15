import { FlowRefTargetExistsRule } from '../../src/rules/operations/FlowRefTargetExistsRule';
import { ConnectorCredentialsSecuredRule } from '../../src/rules/security/ConnectorCredentialsSecuredRule';
import { SecurePropertiesKeyRule } from '../../src/rules/security/SecurePropertiesKeyRule';
import { TlsKeystorePasswordRule } from '../../src/rules/security/TlsKeystorePasswordRule';
import { SecurePropertiesEncryptionRule } from '../../src/rules/security/SecurePropertiesEncryptionRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('P0 Security & Integrity Rules', () => {
  const createContext = (
    filePath = 'test.xml',
    overrides: Partial<ValidationContext> = {},
  ): ValidationContext => ({
    filePath,
    relativePath: filePath,
    projectRoot: '/project',
    config: { enabled: true },
    ...overrides,
  });

  // =================================================================
  // HYG-004: Flow-Ref Target Exists
  // =================================================================
  describe('FlowRefTargetExistsRule (HYG-004)', () => {
    const rule = new FlowRefTargetExistsRule();

    it('should pass when flow-ref targets exist in the same file', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <flow-ref name="helper-subflow" doc:name="Call Helper"/>
          </flow>
          <sub-flow name="helper-subflow">
            <logger message="hello"/>
          </sub-flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail when flow-ref targets a non-existent flow (intra-file)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <flow-ref name="missing-flow" doc:name="Call Missing"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('HYG-004');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('missing-flow');
    });

    it('should pass when flow-ref target exists in allFlowNames (cross-file)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <flow-ref name="other-file-flow"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const allFlowNames = new Set(['other-file-flow', 'main-flow']);
      const issues = rule.validate(result.document!, createContext('test.xml', { allFlowNames }));
      expect(issues).toHaveLength(0);
    });

    it('should skip dynamic flow-refs with DataWeave expressions', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <flow-ref name="#[vars.targetFlow]"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should skip dynamic flow-refs with property placeholders', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="main-flow">
            <flow-ref name="\${flow.target}"/>
          </flow>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('HYG-004');
      expect(rule.category).toBe('operations');
      expect(rule.issueType).toBe('bug');
    });
  });

  // =================================================================
  // SEC-007: Connector Credentials Secured
  // =================================================================
  describe('ConnectorCredentialsSecuredRule (SEC-007)', () => {
    const rule = new ConnectorCredentialsSecuredRule();

    it('should pass for ${secure::} placeholders', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <salesforce:sfdc-config name="SF_Config">
            <salesforce:basic-connection
              username="\${secure::sf.username}"
              password="\${secure::sf.password}"
              securityToken="\${secure::sf.token}"/>
          </salesforce:sfdc-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for plain ${...} placeholders on credentials', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:salesforce="http://www.mulesoft.org/schema/mule/salesforce">
          <salesforce:sfdc-config name="SF_Config">
            <salesforce:basic-connection
              username="\${sf.username}"
              password="\${sf.password}"/>
          </salesforce:sfdc-config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues[0].ruleId).toBe('SEC-007');
      expect(issues[0].message).toContain('plain property placeholder');
    });

    it('should fail for hardcoded credentials', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:db="http://www.mulesoft.org/schema/mule/db">
          <db:generic-connection password="myPlainPassword123"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('hardcoded');
    });

    it('should pass for DataWeave expressions', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:db="http://www.mulesoft.org/schema/mule/db">
          <db:generic-connection password="#[vars.dbPassword]"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should detect NetSuite token-based auth credentials', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:netsuite="http://www.mulesoft.org/schema/mule/netsuite">
          <netsuite:token-based-authentication-connection
            consumerKey="plainKey"
            consumerSecret="plainSecret"
            tokenId="plainTokenId"
            tokenSecret="plainTokenSecret"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(4);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('SEC-007');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('security');
      expect(rule.issueType).toBe('vulnerability');
    });
  });

  // =================================================================
  // SEC-008: Secure Properties Key
  // =================================================================
  describe('SecurePropertiesKeyRule (SEC-008)', () => {
    const rule = new SecurePropertiesKeyRule();

    it('should pass for key using property placeholder', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            doc:name="Secure Properties"
            key="\${secure.key}"
            file="config-\${env}.yaml"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for hardcoded encryption key', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            doc:name="Secure Properties"
            key="MyHardcodedKey123!"
            file="config-\${env}.yaml"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('SEC-008');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('hardcoded encryption key');
    });

    it('should handle secure-configuration-properties element', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <secure-configuration-properties
            key="AnotherHardcodedKey"
            file="secure.yaml"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('SEC-008');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('security');
      expect(rule.issueType).toBe('vulnerability');
    });
  });

  // =================================================================
  // SEC-009: TLS Keystore Password Secured
  // =================================================================
  describe('TlsKeystorePasswordRule (SEC-009)', () => {
    const rule = new TlsKeystorePasswordRule();

    it('should pass for ${secure::} passwords', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
          <tls:context name="TLS_Config">
            <tls:key-store path="\${tls.keystore.path}"
              password="\${secure::tls.keystore.password}"
              keyPassword="\${secure::tls.key.password}"/>
            <tls:trust-store path="\${tls.truststore.path}"
              password="\${secure::tls.truststore.password}"/>
          </tls:context>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should fail for plain ${...} keystore passwords', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
          <tls:context name="TLS_Config">
            <tls:key-store path="keystore.jks"
              password="\${tls.keystore.password}"/>
          </tls:context>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('SEC-009');
      expect(issues[0].message).toContain('plain property placeholder');
    });

    it('should fail for hardcoded keystore passwords', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
          <tls:context name="TLS_Config">
            <tls:key-store password="changeit"/>
            <tls:trust-store password="changeit"/>
          </tls:context>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(2);
      expect(issues[0].message).toContain('hardcoded');
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('SEC-009');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('security');
      expect(rule.issueType).toBe('vulnerability');
    });
  });

  // =================================================================
  // SEC-010: Secure Properties Encryption
  // =================================================================
  describe('SecurePropertiesEncryptionRule (SEC-010)', () => {
    const rule = new SecurePropertiesEncryptionRule();

    it('should pass for strong encryption algorithm', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            key="\${secure.key}" file="config.yaml">
            <secure-properties:encrypt algorithm="AES" mode="CBC"/>
          </secure-properties:config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should warn when no encrypt element exists', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            key="\${secure.key}" file="config.yaml"/>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('no <encrypt> element');
    });

    it('should fail for weak encryption algorithm (DES)', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            key="\${secure.key}" file="config.yaml">
            <secure-properties:encrypt algorithm="DES"/>
          </secure-properties:config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('Weak encryption algorithm');
      expect(issues[0].message).toContain('DES');
    });

    it('should pass for Blowfish algorithm', () => {
      const xml = `
        <mule xmlns="http://www.mulesoft.org/schema/mule/core"
              xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties">
          <secure-properties:config name="Secure_Config"
            key="\${secure.key}" file="config.yaml">
            <secure-properties:encrypt algorithm="Blowfish"/>
          </secure-properties:config>
        </mule>`;
      const result = parseXml(xml);
      expect(result.success).toBe(true);

      const issues = rule.validate(result.document!, createContext());
      expect(issues).toHaveLength(0);
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('SEC-010');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('security');
      expect(rule.issueType).toBe('vulnerability');
    });
  });
});
