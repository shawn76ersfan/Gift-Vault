// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const convexPlugin = require('@convex-dev/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'convex/_generated/*', '.expo/*'],
  },
  {
    files: ['convex/**/*.ts'],
    plugins: { '@convex-dev': convexPlugin },
    rules: {
      '@convex-dev/no-old-registered-function-syntax': 'error',
      '@convex-dev/require-args-validator': 'error',
      '@convex-dev/explicit-table-ids': 'error',
      '@convex-dev/no-filter-in-query': 'warn',
      '@convex-dev/no-top-of-hour-crons': 'warn',
      '@convex-dev/no-schema-import-cycle': 'error',
      '@convex-dev/no-duplicate-indexes': 'error',
      // Typed `env` from convex.config.ts needs a deployment push to codegen; revisit once env vars are set.
      '@convex-dev/no-process-env': 'off',
    },
  },
]);
