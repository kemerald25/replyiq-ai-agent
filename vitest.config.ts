import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": path.resolve(
        __dirname,
        "apps/agent/tests/shims/cloudflare-workers.ts"
      ),
      "@replyiq/schema": path.resolve(__dirname, "packages/schema/src/index.ts"),
      "@replyiq/templates": path.resolve(__dirname, "packages/templates/src/index.ts"),
      "@replyiq/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@replyiq/agent": path.resolve(__dirname, "packages/agent/src/index.ts"),
    },
  },
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
        "packages/agent/src/**/*.ts",
        "apps/sites/src/**/*.ts",
        "apps/agent/src/**/*.ts",
        "apps/gateway/src/**/*.ts",
      ],
      exclude: [
        "packages/**/src/**/index.ts",
        "packages/**/src/**/types.ts",
        "apps/**/src/**/types.ts",
        "packages/**/src/**/context.ts",
        "packages/**/src/**/errors.ts",
        "packages/**/src/**/interfaces.ts",
        "packages/**/src/contracts/**",
        "packages/**/scripts/**",
        "packages/agent/src/eval/runner.ts",
        "apps/**/scripts/**",
        "apps/gateway/src/transport/whatsapp-transport.ts",
        "apps/gateway/src/transport/interface.ts",
        "apps/gateway/src/transport/index.ts",
        "apps/gateway/src/index.ts",
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
