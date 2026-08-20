import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateApiContract } from '../../src/api-contract';

const fixtures = path.resolve('tests/fixtures/api-contract');

describe('validateApiContract', () => {
  it('validates a multi-file RAML 1.0 contract without network access', async () => {
    const report = await validateApiContract({
      projectPath: path.join(fixtures, 'raml'),
      rulesetPaths: [path.resolve('rulesets/mule-http-api-baseline.yaml')],
    });

    expect(report.format).toBe('raml-1.0');
    expect(report.mainFile).toBe('api.raml');
    expect(report.functionalConforms).toBe(true);
    expect(report.governanceConforms).toBe(true);
    expect(report.findings).toEqual([]);
  }, 20_000);

  it('validates an OpenAPI 3.0 contract', async () => {
    const report = await validateApiContract({ projectPath: path.join(fixtures, 'oas') });
    expect(report.format).toBe('oas-3.0');
    expect(report.functionalConforms).toBe(true);
    expect(report.governanceConforms).toBe('not-run');
  });

  it('reports portable governance failures separately from AMF conformance', async () => {
    const report = await validateApiContract({
      projectPath: path.join(fixtures, 'governance'),
      rulesetPaths: [path.resolve('rulesets/mule-http-api-baseline.yaml')],
    });
    expect(report.functionalConforms).toBe(true);
    expect(report.governanceConforms).toBe(false);
    expect(report.findings.some((finding) => finding.engine === 'governance')).toBe(true);
  }, 20_000);

  it('returns AMF findings for an invalid contract', async () => {
    const report = await validateApiContract({ projectPath: path.join(fixtures, 'invalid') });
    expect(report.functionalConforms).toBe(false);
    expect(report.findings.some((finding) => finding.engine === 'amf')).toBe(true);
  });

  it('rejects a main file outside the project root', async () => {
    await expect(
      validateApiContract({
        projectPath: path.join(fixtures, 'oas'),
        mainFile: '../invalid/openapi.yaml',
      }),
    ).rejects.toThrow(/escapes the project root/);
  });

  it('does not fetch implicit HTTP dependencies', async () => {
    const started = Date.now();
    const report = await validateApiContract({ projectPath: path.join(fixtures, 'remote') });
    expect(report.functionalConforms).toBe(false);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(report.findings.length).toBeGreaterThan(0);
  });
});
