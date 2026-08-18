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
    expect(() => parseLintConfig({ defaultFormatter: 'xml' })).toThrow(
      /defaultFormatter.*Invalid enum value/,
    );
  });

  it('accepts built-in profiles while warning for reserved and unknown keys', () => {
    const result = parseLintConfig({
      extends: 'mule-lint:recommended',
      customRulesPath: './rules',
      futureOption: true,
    });
    expect(result.config.extends).toBe('mule-lint:recommended');
    expect(result.config).not.toHaveProperty('futureOption');
    expect(result.warnings).toEqual([
      'Configuration key "customRulesPath" is reserved and has no effect in mule-lint 1.x.',
      'Unknown configuration key "futureOption" was ignored.',
    ]);
  });

  it('rejects unknown or multiple profiles', () => {
    expect(() => parseLintConfig({ extends: 'team-config' })).toThrow(/extends/);
    expect(() => parseLintConfig({ extends: ['mule-lint:baseline', 'mule-lint:strict'] })).toThrow(
      /extends/,
    );
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
