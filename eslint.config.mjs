import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'src/app/generated/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
