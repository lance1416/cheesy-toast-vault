import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? "100%" : "50%",
  reporter: isCI ? "github" : "html",
  // db-setup: creates test DB, runs migrations, truncates rows before every run.
  globalSetup: "./e2e/db-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "unauthenticated",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: "**/vault.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "totp",
      testMatch: "**/totp.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Use the production build in CI (catches hydration mismatches, optimised bundles).
    // Re-use the dev server locally to avoid the extra build step each run.
    command: isCI
      ? `DATABASE_URL="${TEST_DB_URL}" BYPASS_RATE_LIMIT=1 pnpm build && DATABASE_URL="${TEST_DB_URL}" BYPASS_RATE_LIMIT=1 pnpm start`
      : `DATABASE_URL="${TEST_DB_URL}" BYPASS_RATE_LIMIT=1 pnpm dev`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 180_000 : 60_000,
  },
});
