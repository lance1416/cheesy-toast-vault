import { test, expect } from "./fixtures";

// ── Login page ────────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /open vault/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /invalid email or password/i }),
    ).toBeVisible();
  });

  test("correct credentials redirect to /vaults", async ({ page, userData }) => {
    // userData is a per-test user seeded in the DB — no shared state.
    await page.getByLabel("Email").fill(userData.email);
    await page.locator("#login-password").fill(userData.password);
    await page.getByRole("button", { name: /open vault/i }).click();
    await expect(page).toHaveURL(/\/vaults/, { timeout: 10_000 });
  });
});

// ── Register page ─────────────────────────────────────────────────────────────

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("submit is disabled until email and matching passwords are filled", async ({ page }) => {
    await expect(page.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  test("shows character count hint when password is too short", async ({ page }) => {
    await page.locator("#login-password").fill("short");
    await expect(page.getByText(/more character/i)).toBeVisible();
  });
});

// ── Forgot password page ──────────────────────────────────────────────────────

test.describe("Forgot password page", () => {
  test("shows success message for any email (prevents enumeration)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill("anyone@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5_000 });
  });
});

// ── Redirect behaviour ────────────────────────────────────────────────────────

test.describe("Auth redirects", () => {
  test("unauthenticated users see the public landing page at /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("unauthenticated users are redirected to /login for protected routes", async ({ page }) => {
    await page.goto("/vaults");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/verify-email without token redirects to /login?verifyError=1", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page).toHaveURL(/verifyError=1/);
  });
});
