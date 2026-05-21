import { test, expect, type Page } from "@playwright/test";
import { TEST_LOCKED_VAULT_NAME } from "./test-data";

/** Navigate to the E2E Vault and unlock it (works with any password when the vault is empty). */
async function navigateAndUnlock(page: Page): Promise<void> {
  await page.goto("/vaults");
  await page.getByText("E2E Vault").click();
  await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  await page.getByPlaceholder(/vault password/i).fill("any-password");
  await page.getByRole("button", { name: /^unlock$/i }).click();
  await expect(page.getByRole("button", { name: /\+ add entry/i })).toBeVisible({
    timeout: 10_000,
  });
}
// storageState from playwright.config.ts gives us the authenticated session

test.describe("Vault list page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/vaults");
  });

  test("renders the vault list", async ({ page }) => {
    await expect(page.getByText("E2E Vault")).toBeVisible({ timeout: 5_000 });
  });

  test("shows the user avatar / menu", async ({ page }) => {
    await expect(page.getByRole("button", { name: "User menu" })).toBeVisible();
  });

  test("clicking a vault navigates to the vault detail page", async ({ page }) => {
    await page.getByText("E2E Vault").click();
    await expect(page).toHaveURL(/\/vault\/.+/, { timeout: 5_000 });
  });
});

test.describe("Vault detail page (authenticated)", () => {
  test("shows the lock screen before the vault password is entered", async ({ page }) => {
    await page.goto("/vaults");
    await page.getByText("E2E Vault").click();
    // The lock screen has a password input to unlock the vault
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows vault header with vault name", async ({ page }) => {
    await page.goto("/vaults");
    await page.getByText("E2E Vault").click();
    await expect(page.getByText("E2E Vault")).toBeVisible({ timeout: 5_000 });
  });

  test("wrong vault password shows an error and keeps the vault locked", async ({ page }) => {
    // Navigate to the seeded locked vault (has a real encrypted entry — empty vaults accept any password)
    await page.goto("/vaults");
    await page.getByText(TEST_LOCKED_VAULT_NAME).click();
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill("WrongVaultPass1!");
    await page.getByRole("button", { name: /^unlock$/i }).click();
    // The lock screen surfaces "Incorrect vault password." via an alert
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect vault password/i }),
    ).toBeVisible({ timeout: 5_000 });
    // The vault should remain locked — no entries are visible
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible();
  });
});

test.describe.serial("Vault entry CRUD (authenticated)", () => {
  test("unlocking an empty vault shows the empty state", async ({ page }) => {
    await navigateAndUnlock(page);
    await expect(page.getByText(/this vault is empty/i)).toBeVisible({ timeout: 5_000 });
  });

  test("creating an entry shows it in the grid", async ({ page }) => {
    await navigateAndUnlock(page);
    await page.getByRole("button", { name: /\+ add entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Fill name (required) then submit with Enter — the Save button may be below the fold
    // now that the "2FA Secret" field was added to the form.
    await page.locator("#new-name").fill("E2E Test Entry");
    await page.locator("#new-name").press("Enter");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("E2E Test Entry")).toBeVisible({ timeout: 5_000 });
  });

  test("editing an entry updates its name", async ({ page }) => {
    await navigateAndUnlock(page);
    // Expand the card by clicking the chevron / anywhere on the header
    await page.getByText("E2E Test Entry").click();
    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const nameField = page.locator("#edit-name");
    await nameField.clear();
    await nameField.fill("E2E Renamed Entry");
    await nameField.press("Enter");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("E2E Renamed Entry")).toBeVisible({ timeout: 5_000 });
  });

  test("search filters entries by name", async ({ page }) => {
    await navigateAndUnlock(page);
    // Create a second entry to verify filtering works
    await page.getByRole("button", { name: /\+ add entry/i }).click();
    await page.locator("#new-name").fill("Filtered Out Entry");
    await page.locator("#new-name").press("Enter");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    await page.locator("#vault-search").fill("E2E Renamed");
    await expect(page.getByText("E2E Renamed Entry")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("Filtered Out Entry")).not.toBeVisible();
  });

  test("deleting an entry removes it from the grid", async ({ page }) => {
    await navigateAndUnlock(page);
    // Open edit modal for the renamed entry
    await page.locator("#vault-search").fill("E2E Renamed");
    await page.getByText("E2E Renamed Entry").click();
    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /delete entry/i }).click();
    await page.getByRole("button", { name: /yes, delete/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await page.locator("#vault-search").fill("E2E Renamed");
    await expect(page.getByText("E2E Renamed Entry")).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Settings page (authenticated)", () => {
  test("renders the settings page", async ({ page }) => {
    await page.goto("/settings");
    // Settings page has a section for changing login password
    await expect(page.getByText(/change login password/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Sign out", () => {
  test("signing out redirects to login", async ({ page }) => {
    await page.goto("/vaults");
    // Open user menu
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/", { timeout: 5_000 });
  });
});
