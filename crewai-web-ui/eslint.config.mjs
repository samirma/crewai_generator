import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Pre-existing patterns surfaced by newer plugin rules; kept visible as
    // warnings until the code is refactored.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/display-name": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**"]),
]);

export default eslintConfig;
