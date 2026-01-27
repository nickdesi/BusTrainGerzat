import security from "eslint-plugin-security";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  // Global ignores
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
      "debug_pipeline.js",
      "test_date_format.js",
    ],
  },
  // Security config (Flat Config compatible)
  security.configs.recommended,
  // Next.js configs (Flat Config compatible)
  ...nextVitals,
  ...nextTs,
  // Overrides
  {
    rules: {
      // Disable this rule as it seems to be missing in the current plugin version or causing issues
      "react-hooks/preserve-manual-memoization": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
