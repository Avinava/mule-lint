import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/tests/**',
    ],
  },

  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'eslint.config.js',
            'commitlint.config.ts',
            'vitest.config.ts',
          ],
        },
      },
    },
  },

  // ── Source rules ──────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'warn',

      // Downgrade noisy strict rules to warn (track, don't block)
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-extraneous-class': 'warn',
      '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
    },
  },

  // ── CLI entry-points ─────────────────────────────────────────
  {
    files: ['bin/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
    },
  },
  // ── Config files (not production code) ────────────────────────
  {
    files: ['eslint.config.js', 'commitlint.config.ts', 'vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },

  eslintConfigPrettier,
);
