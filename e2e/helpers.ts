import type { Page } from "@playwright/test";

/**
 * Navigate to /login, submit email + password, and wait for the TOTP challenge
 * page at /login/totp. Use this as the preamble for any test that needs to reach
 * the TOTP second-factor step.
 */
export async function submitPasswordStep(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /open vault/i }).click();
  await page.waitForURL(/\/login\/totp/, { timeout: 10_000 });
}
