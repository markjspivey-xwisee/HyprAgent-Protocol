import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@hyprcat/protocol": path.resolve(__dirname, "packages/protocol/src"),
      "@hyprcat/sdk": path.resolve(__dirname, "packages/sdk/src"),
      "@hyprcat/server": path.resolve(__dirname, "packages/server/src"),
      "@hyprcat/agent-runtime": path.resolve(__dirname, "packages/agent-runtime/src"),
    },
  },
});
