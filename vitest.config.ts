import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      '#shared': resolve(root, 'shared'),
      '#platform': resolve(root, 'platform'),
      '#app': resolve(root, 'apps/ecommerce'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.contract.ts'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['apps/**/*.ts', 'platform/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/index.ts', '**/*.d.ts', 'platform/server/**', 'apps/**/workspace/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
