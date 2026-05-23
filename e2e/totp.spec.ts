/**
 * E2E tests for TOTP/2FA.
 *
 * Every test is fully independent:
 *  - TOTP login / backup-code tests use totpUserData — a per-test user seeded
 *    with TOTP enabled and two known backup codes.
 *  - Enrollment tests use authedPage — a per-test user with TOTP disabled.
 *  - Disable / wrong-code tests use authedTotpPage — a per-test TOTP-enabled
 *    user whose session is injected directly (credentials login would throw
 *    mfa_required for a TOTP user).
 *
 * Tests run fully in parallel; each fixture user is deleted after its test.
 */
import {
  test,
  expect,
  FIXTURE_TOTP_SECRET,
  FIXTURE_BACKUP_CODE_1,
  FIXTURE_BACKUP_CODE_2,
} from "./fixtures";
import { generate } from "otplib";
import { submitPasswordStep } from "./helpers";

// ── Login with TOTP ───────────────────────────────────────────────────────────

test.describe("Login with TOTP enabled", () => {
  test("password step redirects to /login/totp", async ({ page, totpUserData }) => {
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible();
  });

  test("correct TOTP code completes login", async ({ page, totpUserData }) => {
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    const code = await generate({ secret: FIXTURE_TOTP_SECRET });
    await page.locator("#totp-code").fill(code);
    await page.getByRole("button", { name: /verify/i }).click();
    await page.waitForURL("/vaults", { timeout: 10_000 });
  });

  test("wrong TOTP code shows an error", async ({ page, totpUserData }) => {
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    await page.locator("#totp-code").fill("000000");
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid code/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login\/totp/);
  });

  test("navigating to /login/totp directly redirects to /login", async ({ page }) => {
    await page.goto("/login/totp");
    await page.waitForURL(/\/login/, { timeout: 5_000 });
  });

  test("/login/totp page shows a 'Back to login' link", async ({ page, totpUserData }) => {
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    await expect(page.getByRole("link", { name: /back to login/i })).toBeVisible();
  });
});

// ── Backup codes ──────────────────────────────────────────────────────────────

test.describe("Login with backup codes", () => {
  test("first backup code authenticates and is then consumed", async ({ page, totpUserData }) => {
    // ── Step 1: log in with code 1 ────────────────────────────────────────────
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    await page.locator("#totp-code").fill(FIXTURE_BACKUP_CODE_1);
    await page.getByRole("button", { name: /verify/i }).click();
    await page.waitForURL("/vaults", { timeout: 10_000 });

    // ── Step 2: sign out ──────────────────────────────────────────────────────
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("/", { timeout: 5_000 });

    // ── Step 3: code 1 is consumed — should be rejected ───────────────────────
    await submitPasswordStep(page, totpUserData.email, totpUserData.password);
    await page.locator("#totp-code").fill(FIXTURE_BACKUP_CODE_1);
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid code/i })).toBeVisible({
      timeout: 5_000,
    });

    // ── Step 4: code 2 still works ────────────────────────────────────────────
    await page.locator("#totp-code").fill(FIXTURE_BACKUP_CODE_2);
    await page.getByRole("button", { name: /verify/i }).click();
    await page.waitForURL("/vaults", { timeout: 10_000 });
  });
});

// ── Enrollment via Settings ───────────────────────────────────────────────────

test.describe("Enroll TOTP from Settings", () => {
  test("Settings shows 2FA section with Disabled badge", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible();
    await expect(page.getByText("Disabled")).toBeVisible();
    await expect(page.getByRole("button", { name: /set up authenticator/i })).toBeVisible();
  });

  test("full enrollment flow: QR → verify code → backup codes → Enabled badge", async ({
    authedPage: page,
  }) => {
    await page.goto("/settings");

    // Capture the setup response object synchronously (no await in the handler).
    // The previous approach used an async handler that called response.json()
    // inside page.on("response"). Playwright does not await async event listeners,
    // so the json() call raced against the following expect() in production where
    // only one request fires (no StrictMode double-invoke). Storing the Response
    // object synchronously and deferring json() until after the Continue button is
    // enabled avoids the race: by that point React has applied the result to state,
    // meaning the body is already buffered and json() resolves immediately.
    // In dev (StrictMode fires effects twice) the handler overwrites with the last
    // response, which is the one React uses — correct in both modes.
    let lastSetupResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    page.on("response", (r) => {
      if (
        r.url().includes("/api/auth/totp") &&
        !r.url().includes("/verify") &&
        r.request().method() === "POST"
      ) {
        lastSetupResponse = r;
      }
    });

    await page.getByRole("button", { name: /set up authenticator/i }).click();
    await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled({ timeout: 10_000 });

    const { secret: enrollSecret } = (await lastSetupResponse!.json()) as { secret: string };
    expect(enrollSecret).toBeTruthy();

    await page.getByRole("button", { name: /continue/i }).click();

    const code = await generate({ secret: enrollSecret });
    await page.locator("#setup-totp-code").fill(code);
    await expect(page.getByRole("button", { name: /enable 2fa/i })).toBeEnabled();

    const [verifyResponse] = await Promise.all([
      page.waitForResponse("**/api/auth/totp/verify"),
      page.getByRole("button", { name: /enable 2fa/i }).click(),
    ]);
    expect(verifyResponse.status()).toBe(200);

    await expect(page.getByText(/save your backup codes/i)).toBeVisible();
    const codeElements = await page.locator("code").all();
    expect(codeElements.length).toBeGreaterThanOrEqual(10);

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /done/i }).click();

    await expect(page.getByText("Enabled")).toBeVisible();
    await expect(page.getByText("Disabled")).not.toBeVisible();
  });
});

// ── Disable 2FA ───────────────────────────────────────────────────────────────
// Uses authedTotpPage — a per-test TOTP-enabled user with session injected directly.

test.describe("Disable 2FA", () => {
  test("Settings shows Enabled badge and Disable button", async ({ authedTotpPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Enabled")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /disable 2fa/i })).toBeVisible();
  });

  test("clicking disable shows the code input; cancel restores Enabled state", async ({
    authedTotpPage: page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByText("Enabled")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /disable 2fa/i }).click();
    await expect(page.locator("#disable-totp-code")).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm disable/i })).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Enabled")).toBeVisible();
    await expect(page.locator("#disable-totp-code")).not.toBeVisible();
  });

  test("wrong code shows an error and keeps 2FA enabled", async ({ authedTotpPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Enabled")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /disable 2fa/i }).click();
    await page.locator("#disable-totp-code").fill("000000");
    await page.getByRole("button", { name: /confirm disable/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid code/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Enabled")).toBeVisible();
  });
});
