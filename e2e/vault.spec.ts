import { test, expect, type VaultData, FIXTURE_PASSWORD } from "./fixtures";
import type { Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate directly to a vault and unlock it. Empty vaults accept any password. */
async function unlockVault(page: Page, vault: VaultData): Promise<void> {
  await page.goto(`/vault/${vault.id}`);
  await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
  await page.getByPlaceholder(/vault password/i).fill("any-password");
  await page.getByRole("button", { name: /^unlock vault$/i }).click();
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
    await expect(page.getByRole("heading", { name: vaultData.name })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows the user avatar / menu", async ({ authedPage: page }) => {
    await page.goto("/vaults");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("clicking a vault navigates to the vault detail page", async ({
    authedPage: page,
    vaultData,
  }) => {
    await page.goto("/vaults");
    await page.getByRole("heading", { name: vaultData.name }).click();
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
    // The vault name heading is in the main content area on desktop (the mobile
    // VaultHeader is hidden via md:hidden). Target the visible heading directly.
    await expect(page.getByRole("heading", { name: vaultData.name })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("wrong password shows an error and keeps the vault locked", async ({
    authedPage: page,
    lockedVaultData,
  }) => {
    await page.goto(`/vault/${lockedVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill("WrongVaultPass1!");
    await page.getByRole("button", { name: /^unlock vault$/i }).click();
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

    await page.getByRole("button", { name: /move to trash/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("To Be Deleted")).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Entry types ───────────────────────────────────────────────────────────────

test.describe("Entry types", () => {
  /** Open the new-entry dialog, switch to the given type, and position the
   *  caller to fill in type-specific fields. */
  async function openNewEntryAs(
    page: Page,
    type: "Login" | "Note" | "Card" | "Identity",
  ): Promise<void> {
    await page.getByRole("button", { name: /\+ add entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    if (type !== "Login") {
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("group", { name: /entry type/i })
        .getByRole("button", { name: type })
        .click();
      await expect(dialog.getByRole("heading", { name: `New ${type}` })).toBeVisible();
    }
  }

  test("Note: body text is shown when the card is expanded", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await openNewEntryAs(page, "Note");

    await page.locator("#new-name").fill("Shopping list");
    await page.locator("#new-body").fill("Milk, eggs, cheese");
    await page.getByRole("button", { name: /save entry/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Shopping list")).toBeVisible({ timeout: 5_000 });

    // Expand the card and verify body text is visible
    await page.getByText("Shopping list").click();
    await expect(page.getByText("Milk, eggs, cheese").first()).toBeVisible({ timeout: 3_000 });
  });

  test("Note: no breach-check button is shown", async ({ authedPage: page, vaultData }) => {
    await unlockVault(page, vaultData);
    await openNewEntryAs(page, "Note");

    await page.locator("#new-name").fill("Quick note");
    await page.locator("#new-body").fill("Some secret content");
    await page.getByRole("button", { name: /save entry/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await page.getByText("Quick note").click();
    await expect(page.getByRole("button", { name: /check for breaches/i })).not.toBeVisible();
  });

  test("Card: masked card number shown on expand, full number on reveal", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await openNewEntryAs(page, "Card");

    await page.locator("#new-name").fill("Chase Visa");
    await page.locator("#new-cardnumber").fill("4111111111111234");
    await page.locator("#new-expiry").fill("12/26");
    await page.getByRole("button", { name: /save entry/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Chase Visa")).toBeVisible({ timeout: 5_000 });

    // Expand and check masked number
    await page.getByText("Chase Visa").click();
    await expect(page.getByText("•••• •••• •••• 1234")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("12/26")).toBeVisible();

    // Reveal full number
    await page.getByRole("button", { name: /show number/i }).click();
    await expect(page.getByText("4111111111111234")).toBeVisible();
  });

  test("Identity: full name and phone are shown on expand", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await openNewEntryAs(page, "Identity");

    await page.locator("#new-name").fill("UK Passport");
    await page.locator("#new-fullname").fill("Jane Smith");
    await page.locator("#new-phone").fill("+44 7700 900000");
    await page.locator("#new-idnumber").fill("123456789");
    await page.getByRole("button", { name: /save entry/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("UK Passport")).toBeVisible({ timeout: 5_000 });

    await page.getByText("UK Passport").click();
    await expect(page.getByText("Jane Smith").first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("+44 7700 900000")).toBeVisible();
    await expect(page.getByText("123456789")).toBeVisible();
  });

  test("type picker is not shown in the edit modal (type is immutable)", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await openNewEntryAs(page, "Note");

    await page.locator("#new-name").fill("Immutable note");
    await page.locator("#new-body").fill("content");
    await page.getByRole("button", { name: /save entry/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // Open edit modal
    await page.getByText("Immutable note").click();
    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // No type-picker group in the edit modal
    await expect(page.getByRole("group", { name: /entry type/i })).not.toBeVisible();
    // The edit modal title reflects the type
    await expect(page.getByRole("heading", { name: "Edit Note" })).toBeVisible();
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe("Settings page", () => {
  test("renders the change login password section", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/login password/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Email change ──────────────────────────────────────────────────────────────
// Each test uses its own fixture user, so email mutations are fully isolated —
// no afterAll teardown needed.

test.describe("Settings — email change", () => {
  test("wrong password shows an error", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /change email/i }).click();
    await page.locator("#new-email").fill("changed@test.example");
    await page.locator("#email-current-password").fill("WrongLoginPass1!");
    await page.getByRole("button", { name: /update email/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /current password is incorrect/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#new-email")).toBeVisible();
  });

  test("correct password shows success banner and signs out", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /change email/i }).click();
    await page.locator("#new-email").fill("changed@test.example");
    await page.locator("#email-current-password").fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: /update email/i }).click();
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
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/", { timeout: 5_000 });
  });
});

// ── Custom entry types ────────────────────────────────────────────────────────

test.describe("Custom entry types", () => {
  /** Create a custom type from the settings page. */
  async function createCustomType(
    page: Page,
    typeName: string,
    fields: { label: string }[],
  ): Promise<void> {
    await page.goto("/settings");
    await page.getByRole("button", { name: /\+ new type/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator("#ct-name").fill(typeName);
    for (let i = 0; i < fields.length; i++) {
      if (i > 0) await page.getByRole("button", { name: /\+ add field/i }).click();
      await page.getByPlaceholder(`Field ${i + 1} label`).fill(fields[i].label);
    }

    await page.getByRole("button", { name: /create type/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(typeName)).toBeVisible({ timeout: 5_000 });
  }

  test("creates a custom type in settings and sees it listed", async ({ authedPage: page }) => {
    await createCustomType(page, "Network Device", [{ label: "IP Address" }]);
    // Verify field summary is shown
    await expect(page.getByText("IP Address")).toBeVisible();
  });

  test("custom type appears in the new-entry modal type picker", async ({
    authedPage: page,
    vaultData,
  }) => {
    await createCustomType(page, "Wi-Fi", [{ label: "SSID" }]);

    // Navigate to vault — server re-renders with the new custom type
    await unlockVault(page, vaultData);
    await page.getByRole("button", { name: /\+ add entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(
      page
        .getByRole("group", { name: /custom entry types/i })
        .getByRole("button", { name: "Wi-Fi" }),
    ).toBeVisible();
  });

  test("creates an entry with a custom type and sees field value on expand", async ({
    authedPage: page,
    vaultData,
  }) => {
    await createCustomType(page, "SSH Key", [{ label: "Host" }, { label: "User" }]);

    await unlockVault(page, vaultData);
    await page.getByRole("button", { name: /\+ add entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select the custom type
    await page
      .getByRole("group", { name: /custom entry types/i })
      .getByRole("button", { name: "SSH Key" })
      .click();
    await expect(page.getByRole("heading", { name: "New SSH Key" })).toBeVisible();

    // Fill fields
    const dialog = page.getByRole("dialog");
    await dialog.locator("#new-name").fill("Production box");
    await dialog.getByLabel("Host").fill("192.168.1.100");
    await dialog.getByLabel("User").fill("deploy");
    await page.getByRole("button", { name: /save entry/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Production box")).toBeVisible({ timeout: 5_000 });

    // Expand and verify field values
    await page.getByText("Production box").click();
    await expect(page.getByText("192.168.1.100")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("deploy")).toBeVisible();

    // No breach-check button — only shown for login-type entries
    await expect(page.getByRole("button", { name: /check for breaches/i })).not.toBeVisible();
  });

  test("can edit a custom type name and fields from settings", async ({ authedPage: page }) => {
    await createCustomType(page, "Edit Me", [{ label: "Old Field" }]);

    await page
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit entry type" })).toBeVisible();

    const nameInput = page.locator("#ct-name");
    await nameInput.clear();
    await nameInput.fill("Edited Type");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Edited Type")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Edit Me")).not.toBeVisible();
  });

  test("can delete a custom type from settings", async ({ authedPage: page }) => {
    await createCustomType(page, "To Delete", [{ label: "Field" }]);

    await page
      .getByRole("button", { name: /^delete$/i })
      .first()
      .click();
    await expect(page.getByText("To Delete")).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Decoy vault ───────────────────────────────────────────────────────────────

test.describe("Decoy vault", () => {
  test("real password reveals real entry and hides decoy entry", async ({
    authedPage: page,
    decoyVaultData,
  }) => {
    await page.goto(`/vault/${decoyVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill(decoyVaultData.realPassword);
    await page.getByRole("button", { name: /^unlock vault$/i }).click();

    await expect(page.getByText(decoyVaultData.realEntryName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(decoyVaultData.decoyEntryName)).not.toBeVisible();
  });

  test("decoy password reveals decoy entry and hides real entry", async ({
    authedPage: page,
    decoyVaultData,
  }) => {
    await page.goto(`/vault/${decoyVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill(decoyVaultData.decoyPassword);
    await page.getByRole("button", { name: /^unlock vault$/i }).click();

    await expect(page.getByText(decoyVaultData.decoyEntryName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(decoyVaultData.realEntryName)).not.toBeVisible();
  });

  test("wrong password is rejected even when decoy is configured", async ({
    authedPage: page,
    decoyVaultData,
  }) => {
    await page.goto(`/vault/${decoyVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill("WrongPassword123!");
    await page.getByRole("button", { name: /^unlock vault$/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect vault password/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible();
  });
});

// ── Share links — public page ─────────────────────────────────────────────────
// These tests hit /share/[token] which is public (no auth required).
// authedPage is used for convenience; the auth cookie has no effect here.

test.describe("Share links — public page", () => {
  test("valid token renders the entry label", async ({ authedPage: page, shareLinkData }) => {
    await page.goto(`/share/${shareLinkData.rawToken}`);
    await expect(page.getByRole("heading", { name: shareLinkData.label })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("valid token decrypts and shows field values in the browser", async ({
    authedPage: page,
    shareLinkData,
  }) => {
    await page.goto(`/share/${shareLinkData.rawToken}`);
    // "shareuser" appears only after client-side AES-GCM decryption succeeds
    await expect(page.getByText("shareuser")).toBeVisible({ timeout: 10_000 });
  });

  test("unknown token shows link-not-found card", async ({ authedPage: page }) => {
    await page.goto("/share/" + "f".repeat(64));
    await expect(page.getByRole("heading", { name: /link not found/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("expired token shows link-expired card", async ({ authedPage: page, shareLinkData }) => {
    await page.goto(`/share/${shareLinkData.expiredRawToken}`);
    await expect(page.getByRole("heading", { name: /link expired/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("view-limit-reached token shows appropriate card", async ({
    authedPage: page,
    shareLinkData,
  }) => {
    await page.goto(`/share/${shareLinkData.viewLimitRawToken}`);
    await expect(page.getByRole("heading", { name: /view limit reached/i })).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ── Vault access log ──────────────────────────────────────────────────────────

test.describe("Vault access log", () => {
  test("access log section is visible in settings", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /vault access log/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("empty state is shown when no vaults have been unlocked", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/no vault unlocks recorded yet/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("unlocking a vault creates a visible entry in the access log", async ({
    authedPage: page,
    lockedVaultData,
  }) => {
    // Register the listener before navigating so no response is missed
    const accessLogResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/vault/${lockedVaultData.id}/access`) &&
        res.request().method() === "POST",
      { timeout: 10_000 },
    );

    await page.goto(`/vault/${lockedVaultData.id}`);
    await expect(page.getByPlaceholder(/vault password/i)).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/vault password/i).fill(lockedVaultData.correctPassword);
    await page.getByRole("button", { name: /^unlock vault$/i }).click();
    await expect(page.getByRole("button", { name: /\+ add entry/i })).toBeVisible({
      timeout: 10_000,
    });

    // Wait for the access log POST to receive its response (DB write done)
    const res = await accessLogResponse;
    expect(res.status()).toBe(200);

    await page.goto("/settings");
    // Scope to the vault access log section to avoid matching the sidebar vault nav link
    const accessLogSection = page.getByTestId("vault-access-log-section");
    await expect(accessLogSection.getByText(lockedVaultData.name)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Share links — UI ──────────────────────────────────────────────────────────

test.describe("Share links — UI", () => {
  test("Share button is visible when an entry is expanded", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "My Shareable Entry");
    await page.getByText("My Shareable Entry").click();
    await expect(page.getByRole("button", { name: /^share$/i })).toBeVisible({
      timeout: 3_000,
    });
  });

  test("clicking Share opens the share link modal with Generate link button", async ({
    authedPage: page,
    vaultData,
  }) => {
    await unlockVault(page, vaultData);
    await addEntry(page, "Share Modal Entry");
    await page.getByText("Share Modal Entry").click();
    await page.getByRole("button", { name: /^share$/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: /generate link/i })).toBeVisible({
      timeout: 3_000,
    });
  });
});
