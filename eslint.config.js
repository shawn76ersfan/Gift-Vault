// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'convex/_generated/*', '.expo/*'],
  },
  {
    files: ['convex/**/*.ts'],
    extends: [require('@convex-dev/eslint-plugin').default.configs.recommended],
  },
]);
