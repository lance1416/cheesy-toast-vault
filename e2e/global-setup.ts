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
import { test as setup } from "@playwright/test";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { mkdir } from "fs/promises";
import {
  TEST_USER_EMAIL,
  TEST_USER_LOGIN_PW,
  TEST_VAULT_SALT,
  TEST_VAULT_NAME,
  TEST_LOCKED_VAULT_NAME,
  TEST_LOCKED_VAULT_SALT,
  TEST_LOCKED_VAULT_PASSWORD,
  TEST_TOTP_EMAIL,
  TEST_TOTP_LOGIN_PW,
  TEST_TOTP_SECRET,
  TEST_BACKUP_CODE_1,
  TEST_BACKUP_CODE_2,
} from "./test-data";
import { deriveKey, encryptEntry } from "../prisma/seeds/_crypto";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

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

  // Create the empty test vault (used for unlock + CRUD tests)
  await db.query(
    `INSERT INTO "Vault" (id, name, salt, "userId", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, now())
     ON CONFLICT ("userId", name) DO NOTHING`,
    [TEST_VAULT_NAME, TEST_VAULT_SALT, userId],
  );

  // Create the locked test vault with one real encrypted entry so the lock screen
  // actually validates the password (an empty vault accepts any password).
  const lockedVaultResult = await db.query<{ id: string }>(
    `INSERT INTO "Vault" (id, name, salt, "userId", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, now())
     ON CONFLICT ("userId", name) DO UPDATE SET "updatedAt" = now()
     RETURNING id`,
    [TEST_LOCKED_VAULT_NAME, TEST_LOCKED_VAULT_SALT, userId],
  );
  const lockedVaultId = lockedVaultResult.rows[0].id;

  // Encrypt a dummy entry with the known vault password and insert it
  const saltBytes = new Uint8Array(
    Buffer.from(TEST_LOCKED_VAULT_SALT, "base64"),
  ) as Uint8Array<ArrayBuffer>;
  const cryptoKey = await deriveKey(TEST_LOCKED_VAULT_PASSWORD, saltBytes);
  const { encryptedBlob, iv } = await encryptEntry(cryptoKey, {
    name: "Locked Entry",
    username: "testuser",
    email: "test@example.com",
    password: "locked-entry-pw",
    passwordChangedAt: new Date().toISOString(),
  });
  await db.query(
    `INSERT INTO "VaultEntry" (id, "vaultId", "encryptedBlob", iv, "updatedAt")
     SELECT gen_random_uuid()::text, $1, $2, $3, now()
     WHERE NOT EXISTS (SELECT 1 FROM "VaultEntry" WHERE "vaultId" = $1)`,
    [lockedVaultId, encryptedBlob, iv],
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
