/**
 * Playwright global setup — runs once before authenticated tests.
 *
 * 1. Seeds a verified test user directly into the DB (bypasses email flow).
 * 2. Logs in via the UI and saves the browser session to e2e/.auth/user.json
 *    so authenticated tests can skip the login step.
 */
import "dotenv/config"; // load .env so DATABASE_URL is available
import { test as setup, expect } from "@playwright/test";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { mkdir } from "fs/promises";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

export const TEST_USER_EMAIL = "e2e@example.com";
export const TEST_USER_LOGIN_PW = "TestLogin123!";
// A fixed 16-zero-byte salt (base64). Tests that unlock the vault use this.
export const TEST_VAULT_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";
export const TEST_VAULT_NAME = "E2E Vault";

setup("create test user and save auth state", async ({ page }) => {
  // ── 1. Seed DB ────────────────────────────────────────────────────────────
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // Low bcrypt rounds for speed in tests — NOT for production
  const passwordHash = await bcrypt.hash(TEST_USER_LOGIN_PW, 6);

  // Upsert user (emailVerified=true — skip the email flow)
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO "User" (id, email, "passwordHash", "emailVerified")
     VALUES (gen_random_uuid()::text, $1, $2, true)
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash", "emailVerified" = true
     RETURNING id`,
    [TEST_USER_EMAIL, passwordHash],
  );
  const userId = rows[0].id;

  // Create vault if it doesn't exist yet (unique constraint: userId + name)
  await db.query(
    `INSERT INTO "Vault" (id, name, salt, "userId", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, now())
     ON CONFLICT ("userId", name) DO NOTHING`,
    [TEST_VAULT_NAME, TEST_VAULT_SALT, userId],
  );

  await db.end();

  // ── 2. Log in and save session ─────────────────────────────────────────────
  await mkdir("e2e/.auth", { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  // The password label is "Login Password" — use a broader selector
  await page.locator("#login-password").fill(TEST_USER_LOGIN_PW);
  await page.getByRole("button", { name: /open vault/i }).click();
  await page.waitForURL("/vaults", { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
