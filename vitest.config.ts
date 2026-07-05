import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests run against a real Postgres (embedded locally, service in CI)
// because the budget/cap engines depend on transactions and row locks.
const localTestDb = "postgresql://postgres:postgres@localhost:5445/limited_jobs_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Engine tests share one database — run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.CI_HAS_POSTGRES
        ? (process.env.DATABASE_URL ?? localTestDb)
        : localTestDb,
    },
  },
});
