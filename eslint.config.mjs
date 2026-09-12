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
    "server.js",
    "ecosystem.config.js",
    "deploy/**",
    "dist/**",
    "scripts/**",
    "public/**",
    ".github/**",
    // The Claude Design handoff: the original prototype and its vendored
    // runtime, kept for reference rather than built.
    "design-handoff/**",
  ]),
]);

export default eslintConfig;
