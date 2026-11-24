import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration tests run against their own database (chaserpilot_test), migrated
 * fresh by the global setup — never the development database.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://chaserpilot@127.0.0.1:5438/chaserpilot_test?schema=public";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
      SHOPIFY_API_SECRET: "test-secret",
      SHOPIFY_API_KEY: "test-key",
      SHOPIFY_APP_URL: "https://chaserpilot.test",
      TZ: "UTC",
    },
    fileParallelism: false,
  },
});
