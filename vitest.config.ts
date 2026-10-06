import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "packages/schema/src/**/*.ts",
        "packages/templates/src/**/*.ts",
        "packages/core/src/**/*.ts",
        "apps/sites/src/**/*.ts",
      ],
      exclude: [
        "packages/**/src/**/index.ts",
        "packages/**/src/**/types.ts",
        "packages/**/src/**/context.ts",
        "packages/**/src/**/errors.ts",
        "packages/**/src/**/interfaces.ts",
        "packages/**/scripts/**",
        "apps/**/scripts/**",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
