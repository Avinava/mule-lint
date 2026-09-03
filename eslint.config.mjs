import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const typedConfigs = tseslint.configs.strictTypeChecked.map((config) => ({
  ...config,
  files: ['**/*.ts'],
}));

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/antigravity-plus/**'],
  },
  ...typedConfigs,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['commitlint.config.ts', 'vitest.config.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // These exported classes intentionally provide namespaced static APIs.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Indexed assertions are idiomatic and readable in focused unit tests.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['bin/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['commitlint.config.ts', 'vitest.config.mts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  eslintConfigPrettier,
);
