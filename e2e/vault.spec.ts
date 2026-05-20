import { test, expect } from "@playwright/test";
// storageState from playwright.config.ts gives us the authenticated session

test.describe("Vault list page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
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
    await page.goto("/");
    await page.getByText("E2E Vault").click();
    // The lock screen has a password input to unlock the vault
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows vault header with vault name", async ({ page }) => {
    await page.goto("/");
    await page.getByText("E2E Vault").click();
    await expect(page.getByText("E2E Vault")).toBeVisible({ timeout: 5_000 });
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
    await page.goto("/");
    // Open user menu
    await page.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
