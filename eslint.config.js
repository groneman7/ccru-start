//  @ts-check
import js from '@eslint/js';
import { tanstackConfig } from '@tanstack/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  globalIgnores(['dist', 'src/client/routeTree.gen.ts']),

  // Apply to TS/TSX only
  {
    files: ['**/*.{ts,tsx}'],
  },
  ...tanstackConfig,
  // “extends” equivalents (composed as array entries)
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,

  // Your options + overrides (scoped to ts/tsx via files)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowObjectTypes: 'always' },
      ],
      'import/order': 'off',
      'sort-imports': 'off',
    },
  },
];
