import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // Dependencies and build artifacts
        "node_modules/**",
        "coverage/**",

        // Test files
        "test/**",

        // Configuration files
        "*.config.*",

        // Type definition files (no runtime code)
        "**/*.d.ts",
      ],
    },
  },
});
