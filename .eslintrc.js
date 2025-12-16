module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    env: {
        node: true,
        es2022: true,
    },
    rules: {
        // TypeScript-specific rules
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',

        // General rules
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'prefer-const': 'error',
        'no-var': 'error',
    },
    ignorePatterns: [
        'dist/',
        'node_modules/',
        'coverage/',
        '*.js',
        '!.eslintrc.js',
        '!jest.config.js',
    ],
};
