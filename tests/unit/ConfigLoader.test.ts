import { parseLintConfig } from '../../src/core/ConfigLoader';

describe('parseLintConfig', () => {
  it('validates supported configuration', () => {
    const result = parseLintConfig({
      $schema: 'https://example.test/schema.json',
      rules: { 'MULE-001': { enabled: true, severity: 'error' } },
      defaultFormatter: 'json',
      failOnWarning: true,
    });

    expect(result.config.defaultFormatter).toBe('json');
    expect(result.config.failOnWarning).toBe(true);
    expect(result.config).not.toHaveProperty('$schema');
    expect(result.warnings).toHaveLength(0);
  });

  it('reports actionable validation errors', () => {
    // Assert the intent — the offending key is named and the valid options are
    // listed — rather than the validator's exact wording, which changes between
    // its major versions.
    expect(() => parseLintConfig({ defaultFormatter: 'xml' })).toThrow(/defaultFormatter/);
    expect(() => parseLintConfig({ defaultFormatter: 'xml' })).toThrow(/table/);
    expect(() => parseLintConfig({ defaultFormatter: 'xml' })).toThrow(/sarif/);
  });

  it('preserves compatibility while warning for reserved and unknown keys', () => {
    const result = parseLintConfig({ extends: 'team-config', futureOption: true });
    expect(result.config.extends).toBe('team-config');
    expect(result.config).not.toHaveProperty('futureOption');
    expect(result.warnings).toEqual([
      'Configuration key "extends" is reserved and has no effect in mule-lint 1.x.',
      'Unknown configuration key "futureOption" was ignored.',
    ]);
  });

  it('warns when a quality condition requests unsupported new-code analysis', () => {
    const result = parseLintConfig({
      qualityGate: {
        name: 'New code gate',
        conditions: [
          {
            metric: 'errors',
            operator: '>',
            threshold: 0,
            status: 'fail',
            onNewCode: true,
          },
        ],
      },
    });

    expect(result.warnings).toEqual([
      'Configuration key "qualityGate.conditions.0.onNewCode" is reserved and has no effect in mule-lint 1.x.',
    ]);
  });
});
