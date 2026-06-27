// Minimal ESLint flat config for agentFabric.
// Enforces no-explicit-any and no-console in production code.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'data/', 'coverage/', 'apps/ecommerce/workspace/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'src/infrastructure/cli/**/*.ts', 'tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
