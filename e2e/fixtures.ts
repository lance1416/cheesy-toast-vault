/**
 * Custom Playwright fixtures for cheesy-toast-vault E2E tests.
 *
 * Every fixture that touches the database creates isolated records per-test
 * using random UUIDs, so tests can run fully in parallel without collisions.
 * Cleanup is automatic: the userData teardown deletes the user and all
 * associated rows via CASCADE.
 *
 * Auth is injected by encoding a next-auth JWT directly (same encode() that
 * next-auth uses internally; getToken() decodes with salt="" by default, which
 * matches encode()'s default). No UI login needed for setup.
 */
import "dotenv/config";
import { test as base, type Page } from "@playwright/test";
import { type Browser } from "@playwright/test";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "crypto";
import { encode } from "next-auth/jwt";
import { deriveKey, encryptEntry } from "../prisma/seeds/_crypto";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

const BASE_URL = "http://localhost:3000";

/** Standard password used for all fixture-created users. */
export const FIXTURE_PASSWORD = "TestE2E123!";

/** TOTP secret shared by all fixture TOTP users — deterministic for test code generation. */
export const FIXTURE_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

/** Two backup codes for fixture TOTP users. */
export const FIXTURE_BACKUP_CODE_1 = "AABB1-22CC3";
export const FIXTURE_BACKUP_CODE_2 = "DDEE4-55FF6";

/** Password that unlocks the lockedVaultData fixture vault (internal only). */
const LOCKED_VAULT_PASSWORD = "CorrectVaultPass1!";

function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().replace(/-/g, "")).digest("hex");
}

/** Inject a next-auth session cookie directly — no UI login needed. */
async function authedContext(browser: Browser, userId: string, email: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be set in .env for E2E auth injection");

  const token = await encode({
    token: { sub: userId, email, emailVerified: true },
    secret,
    maxAge: 60 * 60,
  });

  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  return context;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type UserData = { id: string; email: string; password: string };
export type VaultData = { id: string; name: string };
type LockedVaultData = VaultData & { correctPassword: string };
type TotpUserData = UserData & {
  totpSecret: string;
  backupCode1: string;
  backupCode2: string;
};

type Fixtures = {
  /** Per-test Postgres client. Auto-connects and disconnects. */
  db: Client;
  /** Per-test unique user (TOTP disabled, emailVerified). Deleted after test. */
  userData: UserData;
  /** Empty vault belonging to userData. Cleaned up via user CASCADE. */
  vaultData: VaultData;
  /** Vault with one real encrypted entry (accepts only LOCKED_VAULT_PASSWORD). */
  lockedVaultData: LockedVaultData;
  /** Browser page with a valid session for userData (JWT injection, no UI login). */
  authedPage: Page;
  /** Per-test user with TOTP enabled and two known backup codes. Deleted after test. */
  totpUserData: TotpUserData;
  /** Browser page with a valid session for totpUserData. */
  authedTotpPage: Page;
};

export const test = base.extend<Fixtures>({
  db: async ({}, provide) => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    await provide(db);
    await db.end();
  },

  userData: async ({ db }, provide) => {
    const id = randomUUID();
    const email = `e2e-${id.slice(0, 8)}@test.example`;
    const hash = await bcrypt.hash(FIXTURE_PASSWORD, 6);
    await db.query(
      `INSERT INTO "User" (id, email, "passwordHash", "emailVerified", "totpEnabled", "totpSecret", "totpBackupCodes")
       VALUES ($1, $2, $3, true, false, null, '{}')`,
      [id, email, hash],
    );
    await provide({ id, email, password: FIXTURE_PASSWORD });
    await db.query(`DELETE FROM "User" WHERE id = $1`, [id]);
  },

  vaultData: async ({ db, userData }, provide) => {
    const id = randomUUID();
    const name = `vault-${id.slice(0, 8)}`;
    await db.query(
      `INSERT INTO "Vault" (id, name, salt, "userId", "updatedAt")
       VALUES ($1, $2, 'AAAAAAAAAAAAAAAAAAAAAA==', $3, now())`,
      [id, name, userData.id],
    );
    await provide({ id, name });
    // Cleaned up by userData DELETE … CASCADE
  },

  lockedVaultData: async ({ db, userData }, provide) => {
    const id = randomUUID();
    const name = `locked-${id.slice(0, 8)}`;
    const salt = "BBBBBBBBBBBBBBBBBBBBBB==";

    await db.query(
      `INSERT INTO "Vault" (id, name, salt, "userId", "updatedAt")
       VALUES ($1, $2, $3, $4, now())`,
      [id, name, salt, userData.id],
    );

    // Insert one real encrypted entry so the lock screen validates the password.
    // (Empty vaults accept any password — they have nothing to decrypt.)
    const saltBytes = new Uint8Array(Buffer.from(salt, "base64")) as Uint8Array<ArrayBuffer>;
    const cryptoKey = await deriveKey(LOCKED_VAULT_PASSWORD, saltBytes);
    const { encryptedBlob, iv } = await encryptEntry(cryptoKey, {
      name: "Seeded Entry",
      username: "testuser",
      email: "entry@test.example",
      password: "seeded-pw",
      passwordChangedAt: new Date().toISOString(),
    });
    await db.query(
      `INSERT INTO "VaultEntry" (id, "vaultId", "encryptedBlob", iv, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, now())`,
      [id, encryptedBlob, iv],
    );

    await provide({ id, name, correctPassword: LOCKED_VAULT_PASSWORD });
    // Cleaned up by userData DELETE … CASCADE
  },

  authedPage: async ({ browser, userData }, provide) => {
    const context = await authedContext(browser, userData.id, userData.email);
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },

  totpUserData: async ({ db }, provide) => {
    const id = randomUUID();
    const email = `e2e-totp-${id.slice(0, 8)}@test.example`;
    const hash = await bcrypt.hash(FIXTURE_PASSWORD, 6);
    const bc1 = hashBackupCode(FIXTURE_BACKUP_CODE_1);
    const bc2 = hashBackupCode(FIXTURE_BACKUP_CODE_2);
    await db.query(
      `INSERT INTO "User" (id, email, "passwordHash", "emailVerified", "totpEnabled", "totpSecret", "totpBackupCodes")
       VALUES ($1, $2, $3, true, true, $4, ARRAY[$5::text, $6::text])`,
      [id, email, hash, FIXTURE_TOTP_SECRET, bc1, bc2],
    );
    await provide({
      id,
      email,
      password: FIXTURE_PASSWORD,
      totpSecret: FIXTURE_TOTP_SECRET,
      backupCode1: FIXTURE_BACKUP_CODE_1,
      backupCode2: FIXTURE_BACKUP_CODE_2,
    });
    await db.query(`DELETE FROM "User" WHERE id = $1`, [id]);
  },

  authedTotpPage: async ({ browser, totpUserData }, provide) => {
    // totpUserData has totpEnabled=true, so credentials login would throw
    // mfa_required. Inject the JWT directly instead.
    const context = await authedContext(browser, totpUserData.id, totpUserData.email);
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
