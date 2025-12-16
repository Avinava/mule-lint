module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@rules/(.*)$': '<rootDir>/src/rules/$1',
        '^@formatters/(.*)$': '<rootDir>/src/formatters/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^@engine/(.*)$': '<rootDir>/src/engine/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
};
