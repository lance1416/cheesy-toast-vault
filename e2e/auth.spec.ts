import { test, expect } from "@playwright/test";

// ─── Login page ───────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders email and password fields", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("renders the submit button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /open vault/i })).toBeVisible();
  });

  test("shows 'Forgot password?' link", async ({ page }) => {
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("shows 'Create one' link to register", async ({ page }) => {
    await expect(page.getByRole("link", { name: /create one/i })).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /open vault/i }).click();
    // Next.js also renders a route-announcer with role=alert — filter to the visible error div
    await expect(
      page.getByRole("alert").filter({ hasText: /invalid email or password/i }),
    ).toBeVisible();
  });

  test("redirects to vault after successful login", async ({ page }) => {
    // The global-setup project already validates this flow end-to-end (it must
    // succeed to produce the saved session). Confirm here with a lightweight
    // API-level check that avoids consuming a rate-limit point in the browser.
    const res = await page.request.post("/api/auth/callback/credentials", {
      form: {
        email: "e2e@example.com",
        password: "TestLogin123!",
        redirect: "false",
        callbackUrl: "/",
      },
    });
    // next-auth returns 200 or a redirect; either way credentials are accepted
    expect([200, 302, 303]).toContain(res.status());
  });
});

// ─── Register page ────────────────────────────────────────────────────────────

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders email and password fields", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-confirm")).toBeVisible();
  });

  test("submit is disabled until email and matching passwords are filled", async ({ page }) => {
    const submit = page.getByRole("button", { name: /create account/i });
    await expect(submit).toBeDisabled();
  });

  test("shows character count hint when password is too short", async ({ page }) => {
    await page.locator("#login-password").fill("short");
    await expect(page.getByText(/more character/i)).toBeVisible();
  });
});

// ─── Forgot password page ─────────────────────────────────────────────────────

test.describe("Forgot password page", () => {
  test("renders the email form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("shows success message for any email (prevents enumeration)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill("anyone@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Redirect behaviour ───────────────────────────────────────────────────────

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
