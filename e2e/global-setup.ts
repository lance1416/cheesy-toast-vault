/**
 * Playwright global setup — runs once before authenticated tests.
 *
 * 1. Seeds two verified test users directly into the DB (bypasses email flow):
 *    - e2e@example.com        — no 2FA; used for auth tests + authenticated flows
 *    - e2e-totp@example.com  — 2FA enabled with a known secret; used for TOTP tests
 * 2. Logs in as e2e@example.com and saves the browser session to e2e/.auth/user.json
 *    so authenticated tests can skip the login step.
 */
import "dotenv/config"; // load .env so DATABASE_URL is available
import { test as setup, expect } from "@playwright/test";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { mkdir } from "fs/promises";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

export const TEST_USER_EMAIL = "e2e@example.com";
export const TEST_USER_LOGIN_PW = "TestLogin123!";
// A fixed 16-zero-byte salt (base64). Tests that unlock the vault use this.
export const TEST_VAULT_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";
export const TEST_VAULT_NAME = "E2E Vault";

/** User with TOTP pre-enabled — used for 2FA login tests. */
export const TEST_TOTP_EMAIL = "e2e-totp@example.com";
export const TEST_TOTP_LOGIN_PW = "TestTotp123!";
/** Well-known base32 TOTP secret shared between setup and TOTP test specs. */
export const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
/** Two single-use backup codes stored for TOTP recovery tests. */
export const TEST_BACKUP_CODE_1 = "23456-789AB";
export const TEST_BACKUP_CODE_2 = "BCDEF-GHJKM";

function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().replace(/-/g, "")).digest("hex");
}

setup("create test users and save auth state", async ({ page }) => {
  // ── 1. Seed DB ────────────────────────────────────────────────────────────
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // Low bcrypt rounds for speed in tests — NOT for production
  const passwordHash = await bcrypt.hash(TEST_USER_LOGIN_PW, 6);
  const totpPasswordHash = await bcrypt.hash(TEST_TOTP_LOGIN_PW, 6);

  // e2e@example.com — no TOTP; always reset TOTP state so enrollment tests start clean
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO "User" (id, email, "passwordHash", "emailVerified", "totpEnabled", "totpSecret", "totpBackupCodes")
     VALUES (gen_random_uuid()::text, $1, $2, true, false, null, '{}')
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash",
           "emailVerified" = true,
           "totpEnabled"   = false,
           "totpSecret"    = null,
           "totpBackupCodes" = '{}'
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

  // e2e-totp@example.com — TOTP always enabled with known secret + fresh backup codes
  const bc1 = hashBackupCode(TEST_BACKUP_CODE_1);
  const bc2 = hashBackupCode(TEST_BACKUP_CODE_2);
  await db.query(
    `INSERT INTO "User" (id, email, "passwordHash", "emailVerified", "totpEnabled", "totpSecret", "totpBackupCodes")
     VALUES (gen_random_uuid()::text, $1, $2, true, true, $3, ARRAY[$4::text, $5::text])
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash"    = EXCLUDED."passwordHash",
           "emailVerified"   = true,
           "totpEnabled"     = true,
           "totpSecret"      = EXCLUDED."totpSecret",
           "totpBackupCodes" = EXCLUDED."totpBackupCodes"`,
    [TEST_TOTP_EMAIL, totpPasswordHash, TEST_TOTP_SECRET, bc1, bc2],
  );

  await db.end();

  // ── 2. Log in as e2e@example.com and save session ─────────────────────────
  await mkdir("e2e/.auth", { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  // The password label is "Login Password" — use a broader selector
  await page.locator("#login-password").fill(TEST_USER_LOGIN_PW);
  await page.getByRole("button", { name: /open vault/i }).click();
  await page.waitForURL("/vaults", { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
