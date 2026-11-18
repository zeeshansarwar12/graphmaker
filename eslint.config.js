import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.astro/', 'dist/', 'node_modules/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['tests/e2e/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          allowTypeImports: true,
          message: 'Import test and expect from the shared browser-test fixture.',
        }],
      }],
    },
  },
];
