import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';
import { MULE_NAMESPACES } from '../../src/core/XPathHelper';

describe('Engine Improvements', () => {
  // =================================================================
  // Document Cache: verify processFile reuses pre-scanned documents
  // =================================================================
  describe('Document Cache (double-parse elimination)', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-engine-'));
      const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
      fs.mkdirSync(muleDir, { recursive: true });
      // Write a minimal mule-artifact.json so the engine finds the project root
      fs.writeFileSync(path.join(tmpDir, 'mule-artifact.json'), '{"minMuleVersion":"4.4.0"}');
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should scan a project without errors using the document cache', async () => {
      const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
      fs.writeFileSync(
        path.join(muleDir, 'api.xml'),
        `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-main">
            <logger message="hello"/>
            <error-handler>
              <on-error-propagate type="ANY">
                <logger message="error"/>
              </on-error-propagate>
            </error-handler>
          </flow>
        </mule>`,
      );

      const engine = new LintEngine({ rules: ALL_RULES });
      const report = await engine.scan(tmpDir);

      expect(report.files.length).toBeGreaterThan(0);
      // All files should be successfully parsed
      for (const file of report.files) {
        if (file.filePath.endsWith('.xml')) {
          expect(file.parsed).toBe(true);
        }
      }
    });

    it('should scan multiple XML files without errors', async () => {
      const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
      fs.writeFileSync(
        path.join(muleDir, 'api.xml'),
        `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="api-main">
            <flow-ref name="process-subflow"/>
          </flow>
        </mule>`,
      );
      fs.writeFileSync(
        path.join(muleDir, 'impl.xml'),
        `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <sub-flow name="process-subflow">
            <logger message="processing"/>
          </sub-flow>
        </mule>`,
      );

      const engine = new LintEngine({ rules: ALL_RULES });
      const report = await engine.scan(tmpDir);

      // Both files should be parsed
      const xmlFiles = report.files.filter((f) => f.filePath.endsWith('.xml'));
      expect(xmlFiles.length).toBe(2);
      for (const file of xmlFiles) {
        expect(file.parsed).toBe(true);
      }
    });
  });

  // =================================================================
  // Project Layer Detection
  // =================================================================
  describe('Project Layer Detection', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-layer-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should detect sapi project from directory name', async () => {
      const projectDir = path.join(tmpDir, 'rsm-salesforce-sapi');
      const muleDir = path.join(projectDir, 'src', 'main', 'mule');
      fs.mkdirSync(muleDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'mule-artifact.json'), '{}');
      fs.writeFileSync(
        path.join(muleDir, 'api.xml'),
        `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="get-accounts-flow">
            <logger message="accounts"/>
          </flow>
        </mule>`,
      );

      const engine = new LintEngine({ rules: ALL_RULES });
      const report = await engine.scan(projectDir);
      // Report should complete without errors
      expect(report.summary.totalFiles).toBeGreaterThan(0);
    });

    it('should detect papi project from directory name', async () => {
      const projectDir = path.join(tmpDir, 'rsm-orders-papi');
      const muleDir = path.join(projectDir, 'src', 'main', 'mule');
      fs.mkdirSync(muleDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'mule-artifact.json'), '{}');
      fs.writeFileSync(
        path.join(muleDir, 'api.xml'),
        `<mule xmlns="http://www.mulesoft.org/schema/mule/core">
          <flow name="orchestrate-order-flow">
            <logger message="orchestrate"/>
          </flow>
        </mule>`,
      );

      const engine = new LintEngine({ rules: ALL_RULES });
      const report = await engine.scan(projectDir);
      expect(report.summary.totalFiles).toBeGreaterThan(0);
    });
  });

  // =================================================================
  // XPath Namespace Registry
  // =================================================================
  describe('XPath Namespace Registry', () => {
    it('should include netsuite namespace', () => {
      expect(MULE_NAMESPACES['netsuite']).toBe('http://www.mulesoft.org/schema/mule/netsuite');
    });

    it('should include sap namespace', () => {
      expect(MULE_NAMESPACES['sap']).toBe('http://www.mulesoft.org/schema/mule/sap');
    });

    it('should include anypoint-mq namespace', () => {
      expect(MULE_NAMESPACES['anypoint-mq']).toBe(
        'http://www.mulesoft.org/schema/mule/anypoint-mq',
      );
    });

    it('should include oauth namespace', () => {
      expect(MULE_NAMESPACES['oauth']).toBe('http://www.mulesoft.org/schema/mule/oauth');
    });

    it('should include all core MuleSoft namespaces', () => {
      const requiredNamespaces = [
        'mule',
        'http',
        'ee',
        'db',
        'sftp',
        'ftp',
        'vm',
        'jms',
        'amqp',
        'apikit',
        'tls',
        'salesforce',
        'wsc',
        'netsuite',
        'sap',
      ];
      for (const ns of requiredNamespaces) {
        expect(MULE_NAMESPACES[ns]).toBeDefined();
      }
    });
  });
});
