import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@rules': path.resolve(__dirname, 'src/rules'),
      '@formatters': path.resolve(__dirname, 'src/formatters'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
});
