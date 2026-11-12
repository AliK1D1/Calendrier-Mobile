// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // src/lib/ est une copie du site (npm run sync:web), vérifiée par l'ESLint du site.
    ignores: ["dist/*", "src/lib/**", "android/**", "ios/**"],
  },
]);
