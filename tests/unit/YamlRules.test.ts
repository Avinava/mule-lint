import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  EnvironmentFilesRule,
  PropertyNamingRule,
  PlaintextSecretsRule,
} from '../../src/rules/yaml/YamlRules';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

/**
 * Test suite for YAML rules.
 *
 * These rules operate on the filesystem (reading YAML property files from
 * src/main/resources/) rather than on parsed XML, so tests use temporary
 * directories to simulate project layouts.
 */
describe('YAML Rules', () => {
  /** Create a minimal ValidationContext pointing at tmpDir */
  const makeContext = (
    projectRoot: string,
    options?: Record<string, unknown>,
  ): ValidationContext => ({
    filePath: path.join(projectRoot, 'src/main/mule/placeholder.xml'),
    relativePath: 'src/main/mule/placeholder.xml',
    projectRoot,
    config: { enabled: true, options },
  });

  /** Parse a trivial XML doc — these rules ignore the document content */
  const emptyDoc = (): Document => {
    const result = parseXml('<mule/>');
    return result.document!;
  };

  // ===================================================================
  // YAML-001: Environment Properties Files
  // ===================================================================
  describe('EnvironmentFilesRule (YAML-001)', () => {
    const rule = new EnvironmentFilesRule();

    it('should pass when default environments (dev, qa, prod) files exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(path.join(resourcesDir, 'dev.yaml'), 'http.port: 8081\n');
        fs.writeFileSync(path.join(resourcesDir, 'qa.yaml'), 'http.port: 8082\n');
        fs.writeFileSync(path.join(resourcesDir, 'prod.yaml'), 'http.port: 8083\n');

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should report missing environment files for default environments', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        // Only dev.yaml exists; qa and prod are missing
        fs.writeFileSync(path.join(resourcesDir, 'dev.yaml'), 'http.port: 8081\n');

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        // Should report missing qa and prod
        expect(issues).toHaveLength(2);
        const envs = issues.map((i) => i.message);
        expect(envs.some((m) => m.includes('"qa"'))).toBe(true);
        expect(envs.some((m) => m.includes('"prod"'))).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should support configurable environments via rule options', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        // Only dev and staging files exist
        fs.writeFileSync(path.join(resourcesDir, 'dev.yaml'), '');
        fs.writeFileSync(path.join(resourcesDir, 'staging.yaml'), '');

        // Configure rule to require dev, staging, uat — NOT qa/prod
        const ctx = makeContext(tmpDir, { environments: ['dev', 'staging', 'uat'] });
        const issues = rule.validate(emptyDoc(), ctx);

        // Only 'uat' is missing
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain('"uat"');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should accept config-<env>.yaml naming pattern', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        // Use the config- prefix naming convention
        fs.writeFileSync(path.join(resourcesDir, 'config-dev.yaml'), '');
        fs.writeFileSync(path.join(resourcesDir, 'config-qa.yaml'), '');
        fs.writeFileSync(path.join(resourcesDir, 'config-prod.yaml'), '');

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should accept files inside config/ subdirectory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        const configDir = path.join(tmpDir, 'src', 'main', 'resources', 'config');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, 'dev.yaml'), '');
        fs.writeFileSync(path.join(configDir, 'qa.yaml'), '');
        fs.writeFileSync(path.join(configDir, 'prod.yaml'), '');

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should return no issues when src/main/resources does not exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-001-'));
      try {
        // Do NOT create src/main/resources — simulate bare project
        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('YAML-001');
      expect(rule.severity).toBe('warning');
      expect(rule.category).toBe('standards');
    });
  });

  // ===================================================================
  // YAML-003: Property Naming Convention
  // ===================================================================
  describe('PropertyNamingRule (YAML-003)', () => {
    const rule = new PropertyNamingRule();

    it('should pass for dot-separated property keys', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-003-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(
          path.join(resourcesDir, 'dev.yaml'),
          'http:\n  port: 8081\n  host: localhost\n',
        );

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('YAML-003');
      expect(rule.severity).toBe('info');
      expect(rule.category).toBe('standards');
    });
  });

  // ===================================================================
  // YAML-004: No Plaintext Secrets
  // ===================================================================
  describe('PlaintextSecretsRule (YAML-004)', () => {
    const rule = new PlaintextSecretsRule();

    it('should pass when secrets are encrypted', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-004-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(
          path.join(resourcesDir, 'dev.yaml'),
          'db:\n  password: "![encrypted-value-here]"\n',
        );

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues).toHaveLength(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should report plaintext secrets', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-004-'));
      try {
        const resourcesDir = path.join(tmpDir, 'src', 'main', 'resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(path.join(resourcesDir, 'dev.yaml'), 'db:\n  password: "supersecret"\n');

        const issues = rule.validate(emptyDoc(), makeContext(tmpDir));
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].ruleId).toBe('YAML-004');
        expect(issues[0].severity).toBe('error');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });

    it('should have correct rule properties', () => {
      expect(rule.id).toBe('YAML-004');
      expect(rule.severity).toBe('error');
      expect(rule.category).toBe('security');
    });
  });
});
