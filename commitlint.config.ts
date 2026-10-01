import { RuleConfigSeverity, type UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      RuleConfigSeverity.Error,
      'always',
      [
        'cli',
        'core',
        'rules',
        'engine',
        'formatters',
        'mcp',
        'quality',
        'types',
        'docs',
        'test',
        'deps',
        'ci',
        'release',
        'tooling',
      ],
    ],
    'body-max-line-length': [RuleConfigSeverity.Disabled, 'always', Infinity],
  },
};

export default config;
