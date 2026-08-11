import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated files — never hand-edit, never lint
    "src/api/generated/**",
  ]),
  {
    rules: {
      // Overly strict — idiomatic patterns like useEffect(() => setState(true), []) are fine.
      "react-hooks/set-state-in-effect": "off",
      // Empty interface is intentional placeholder for the Redux UI slice.
      "@typescript-eslint/no-empty-object-type": "off",
      // Zod v4 / @hookform/resolvers compatibility requires `as any` casts at the resolver call site.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
