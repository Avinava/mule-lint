import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/types/**',
        'src/mcp/index.ts',
        'src/formatters/html/scripts/**',
        'src/formatters/html/styles/**',
      ],
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 70,
        functions: 85,
      },
    },
  },
});
