// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  // {
  //   languageOptions: {
  //     parserOptions: {
  //       project: true,
  //       tsconfigRootDir: import.meta.dirname,
  //     },
  //   },
  //   rules: {
  //     '@typescript-eslint/no-explicit-any': 'off',
  //   },
  // },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // 'no-unused-vars': ['error', { varsIgnorePattern: '_' }],
    },
  },
);
