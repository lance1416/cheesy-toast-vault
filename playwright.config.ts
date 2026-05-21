import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // serial — shared test DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  globalSetup: "./e2e/db-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Runs first: seeds DB test user and saves browser session to e2e/.auth/user.json
    {
      name: "setup",
      testMatch: "**/global-setup.ts",
    },
    // Auth-page tests — unauthenticated, but depend on setup to have the test user in DB
    {
      name: "unauthenticated",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // Vault tests — depend on setup for both the user and the saved session file
    {
      name: "authenticated",
      testMatch: "**/vault.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    // TOTP/2FA tests — mix of unauthenticated (login flow) and authenticated (settings)
    {
      name: "totp",
      testMatch: "**/totp.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `DATABASE_URL="${TEST_DB_URL}" BYPASS_RATE_LIMIT=1 pnpm dev`,
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
