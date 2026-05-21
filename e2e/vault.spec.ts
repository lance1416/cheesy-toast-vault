import { test, expect, type VaultData, FIXTURE_PASSWORD } from "./fixtures";
import type { Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate directly to a vault and unlock it. Empty vaults accept any password. */
async function unlockVault(page: Page, vault: VaultData): Promise<void> {
  await page.goto(`/vault/${vault.id}`);
  await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  await page.getByPlaceholder(/vault password/i).fill("any-password");
  await page.getByRole("button", { name: /^unlock$/i }).click();
  await expect(page.getByRole("button", { name: /\+ add entry/i })).toBeVisible({
    timeout: 10_000,
  });
}

/** Add an entry to an already-unlocked vault and wait for it to appear. */
async function addEntry(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /\+ add entry/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#new-name").fill(name);
  await page.locator("#new-name").press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 });
}

// ── Vault list ────────────────────────────────────────────────────────────────

test.describe("Vault list page", () => {
  test("renders the vault in the list", async ({ authedPage: page, vaultData }) => {
    await page.goto("/vaults");
    await expect(page.getByText(vaultData.name)).toBeVisible({ timeout: 5_000 });
  });

  test("shows the user avatar / menu", async ({ authedPage: page }) => {
    await page.goto("/vaults");
    await expect(page.getByRole("button", { name: "User menu" })).toBeVisible();
  });

  test("clicking a vault navigates to the vault detail page", async ({
    authedPage: page,
    vaultData,
  }) => {
    await page.goto("/vaults");
    await page.getByText(vaultData.name).click();
    await expect(page).toHaveURL(/\/vault\/.+/, { timeout: 5_000 });
  });
});

// ── Lock screen ───────────────────────────────────────────────────────────────

test.describe("Vault lock screen", () => {
  test("shows the password input before unlocking", async ({ authedPage: page, vaultData }) => {
    await page.goto(`/vault/${vaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows the vault name in the header", async ({ authedPage: page, vaultData }) => {
    await page.goto(`/vault/${vaultData.id}`);
    // <header> has role "banner". The header contains two h1s (mobile + desktop layout);
    // getByRole("heading") excludes the mobile one (display:none in the desktop viewport).
    await expect(
      page.getByRole("banner").getByRole("heading", { name: vaultData.name }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("wrong password shows an error and keeps the vault locked", async ({
    authedPage: page,
    lockedVaultData,
  }) => {
    await page.goto(`/vault/${lockedVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill("WrongVaultPass1!");
    await page.getByRole("button", { name: /^unlock$/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect vault password/i }),
    ).toBeVisible({ timeout: 5_000 });
    // Vault stays locked
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible();
  });
});

// ── Entry CRUD ────────────────────────────────────────────────────────────────
// Each test is fully independent: it unlocks a fresh empty vault and sets up
// whatever data it needs before exercising the feature under test.

test.describe("Vault entry CRUD", () => {
  test("unlocking an empty vault shows the empty state", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await expect(page.getByText(/this vault is empty/i)).toBeVisible({ timeout: 5_000 });
  });

  test("creating an entry shows it in the grid", async ({ authedPage: page, vaultData }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "My New Entry");
  });

  test("editing an entry updates its name", async ({ authedPage: page, vaultData }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "Original Name");

    await page.getByText("Original Name").click();
    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const nameField = page.locator("#edit-name");
    await nameField.clear();
    await nameField.fill("Renamed Entry");
    await nameField.press("Enter");

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Renamed Entry")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Original Name")).not.toBeVisible();
  });

  test("search filters entries by name", async ({ authedPage: page, vaultData }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "Match Me");
    await addEntry(page, "Filter Me Out");

    await page.locator("#vault-search").fill("Match");
    await expect(page.getByText("Match Me")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("Filter Me Out")).not.toBeVisible();
  });

  test("deleting an entry removes it from the grid", async ({ authedPage: page, vaultData }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "To Be Deleted");

    await page.getByText("To Be Deleted").click();
    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /delete entry/i }).click();
    await page.getByRole("button", { name: /yes, delete/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("To Be Deleted")).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe("Settings page", () => {
  test("renders the change login password section", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/change login password/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Email change ──────────────────────────────────────────────────────────────
// Each test uses its own fixture user, so email mutations are fully isolated —
// no afterAll teardown needed.

test.describe("Settings — email change", () => {
  test("wrong password shows an error", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /^change email$/i }).click();
    await page.locator("#new-email").fill("changed@test.example");
    await page.locator("#email-current-password").fill("WrongLoginPass1!");
    await page.getByRole("button", { name: /^update email$/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /current password is incorrect/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#new-email")).toBeVisible();
  });

  test("correct password shows success banner and signs out", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /^change email$/i }).click();
    await page.locator("#new-email").fill("changed@test.example");
    await page.locator("#email-current-password").fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: /^update email$/i }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /verification email sent/i }),
    ).toBeVisible({ timeout: 5_000 });
    // After ~1.5 s the client calls signOut → redirects to /
    await expect(page).toHaveURL("/", { timeout: 8_000 });
  });
});

// ── Sign out ──────────────────────────────────────────────────────────────────

test.describe("Sign out", () => {
  test("signing out redirects to the landing page", async ({ authedPage: page }) => {
    await page.goto("/vaults");
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/", { timeout: 5_000 });
  });
});
