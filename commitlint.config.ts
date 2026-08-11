import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
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
    'body-max-line-length': [0, 'always', Infinity],
  },
};

export default config;
