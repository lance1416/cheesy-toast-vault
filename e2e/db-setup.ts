import "dotenv/config";
import { execSync } from "child_process";
import { Client } from "pg";

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5433/cheesy_toast_vault_test";

export default async function globalSetup() {
  // Derive admin connection URL (connect to the default 'postgres' DB to run CREATE DATABASE)
  const parsed = new URL(TEST_DB_URL);
  const testDbName = parsed.pathname.slice(1);
  parsed.pathname = "/postgres";

  const admin = new Client({ connectionString: parsed.toString() });
  await admin.connect();
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    testDbName,
  ]);
  if ((rowCount ?? 0) === 0) {
    await admin.query(`CREATE DATABASE "${testDbName}"`);
  }
  await admin.end();

  // Apply any pending migrations to the test DB
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });

  // Wipe all rows — each E2E run starts from a clean slate
  const db = new Client({ connectionString: TEST_DB_URL });
  await db.connect();
  await db.query('TRUNCATE "User" CASCADE');
  await db.end();
}
