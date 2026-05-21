"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useVault } from "@/context/vault";
import AlertBanner from "@/components/alert-banner";
import Field from "@/components/field";
import StrengthBar from "@/components/strength-bar";
import VaultHeader from "../_components/vault-header";
import TotpModal from "./totp-modal";

const TIMEOUTS = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 0, label: "Never" },
] as const;

export default function SettingsClient({
  totpEnabled: initialTotpEnabled,
}: {
  totpEnabled: boolean;
}) {
  const { lockTimeout, setLockTimeout } = useVault();
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Email change state
  const [emailPhase, setEmailPhase] = useState<"idle" | "form">("idle");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [disablePhase, setDisablePhase] = useState<"idle" | "confirm">("idle");
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");

  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm">("idle");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete account");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setDeleting(false);
    }
  }

  async function handleDisableTotp(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, "") }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDisableError(data.error ?? "Failed to disable 2FA.");
        return;
      }
      setTotpEnabled(false);
      setDisablePhase("idle");
      setDisableCode("");
    } catch {
      setDisableError("Something went wrong. Please try again.");
    } finally {
      setDisabling(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSubmitting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changeEmail",
          currentPassword: emailCurrentPassword,
          newEmail,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update email");
      }
      setEmailSuccess(true);
      setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  }

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 12 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update password");
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-canvas"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <VaultHeader vaultName="Settings" />

      <main className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-lg font-semibold text-default mb-6">Account Settings</h1>

        <section className="bg-surface rounded-lg border border-line/60 p-6">
          <h2 className="text-base font-semibold text-default mb-5">Change login password</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Current password"
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              autoFocus
            />

            <div>
              <Field
                label="New password"
                id="new-password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                required
              />
              {newPassword && <StrengthBar password={newPassword} />}
              <p className="mt-1.5 text-xs text-muted">Minimum 12 characters.</p>
            </div>

            <div>
              <Field
                label="Confirm new password"
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
              />
              {mismatch && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
                  Passwords do not match.
                </p>
              )}
            </div>

            {error && <AlertBanner message={error} />}

            {success && (
              <div
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                Password updated successfully.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-2"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

        <section className="mt-8 bg-surface rounded-lg border border-line/60 p-6">
          <h2 className="text-base font-semibold text-default mb-1">Change email</h2>
          {session?.user?.email && (
            <p className="text-sm text-muted mb-4">
              Current: <span className="font-medium text-default">{session.user.email}</span>
            </p>
          )}

          {emailSuccess ? (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400"
            >
              Verification email sent. Signing you out…
            </div>
          ) : emailPhase === "idle" ? (
            <button
              type="button"
              onClick={() => setEmailPhase("form")}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
            >
              Change email
            </button>
          ) : (
            <form onSubmit={handleEmailChange} className="space-y-4">
              <Field
                label="New email"
                id="new-email"
                type="email"
                value={newEmail}
                onChange={setNewEmail}
                required
                autoFocus
              />
              <Field
                label="Current password"
                id="email-current-password"
                type="password"
                value={emailCurrentPassword}
                onChange={setEmailCurrentPassword}
                required
              />
              {emailError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                >
                  {emailError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmailPhase("idle");
                    setNewEmail("");
                    setEmailCurrentPassword("");
                    setEmailError("");
                  }}
                  className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSubmitting || !newEmail || !emailCurrentPassword}
                  className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSubmitting ? "Updating…" : "Update email"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="mt-8 bg-surface rounded-lg border border-line/60 p-6">
          <h2 className="text-base font-semibold text-default mb-1">Auto-lock timeout</h2>
          <p className="text-sm text-muted mb-4">
            Lock all open vaults after this period of inactivity.
          </p>
          <div role="group" aria-label="Auto-lock timeout" className="flex flex-wrap gap-2">
            {TIMEOUTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setLockTimeout(value)}
                aria-pressed={lockTimeout === value}
                className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                  lockTimeout === value
                    ? "bg-stone-800 dark:bg-amber-600 text-white border-transparent"
                    : "border-line text-muted hover:border-amber-300 dark:hover:border-amber-700 hover:text-default"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 bg-surface rounded-lg border border-line/60 p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="text-base font-semibold text-default">Two-factor authentication</h2>
              <p className="text-sm text-muted mt-1">
                Require an authenticator code after your password on every sign-in.
              </p>
            </div>
            <span
              className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                totpEnabled
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-stone-100 dark:bg-stone-800 text-muted"
              }`}
            >
              {totpEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {!totpEnabled && disablePhase === "idle" && (
            <button
              type="button"
              onClick={() => setShowTotpModal(true)}
              className="mt-4 rounded-lg bg-stone-800 dark:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98]"
            >
              Set up authenticator app
            </button>
          )}

          {totpEnabled && disablePhase === "idle" && (
            <button
              type="button"
              onClick={() => setDisablePhase("confirm")}
              className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
            >
              Disable 2FA
            </button>
          )}

          {totpEnabled && disablePhase === "confirm" && (
            <form onSubmit={handleDisableTotp} className="mt-4 space-y-4">
              <p className="text-sm text-default font-medium">
                Enter your current authenticator code to disable 2FA.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="disable-totp-code" className="block text-xs font-medium text-muted">
                  Authenticator code
                </label>
                <input
                  id="disable-totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface text-center tracking-[0.25em] font-mono"
                />
              </div>
              {disableError && <AlertBanner message={disableError} />}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDisablePhase("idle");
                    setDisableCode("");
                    setDisableError("");
                  }}
                  className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling || disableCode.length !== 6}
                  className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {disabling ? "Disabling…" : "Confirm disable"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="mt-8 bg-surface rounded-lg border border-red-200 dark:border-red-900/40 p-6">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">
            Danger zone
          </h2>
          <p className="text-sm text-muted mb-5">
            Permanently delete your account and all vault data. This cannot be undone.
          </p>

          {deletePhase === "idle" && (
            <button
              type="button"
              onClick={() => setDeletePhase("confirm")}
              className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Delete my account
            </button>
          )}

          {deletePhase === "confirm" && (
            <form onSubmit={handleDelete} className="space-y-4">
              <p className="text-sm font-medium text-default">
                Enter your password to confirm deletion.
              </p>
              <Field
                label="Current password"
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={setDeletePassword}
                required
                autoFocus
              />
              {deleteError && <AlertBanner message={deleteError} />}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeletePhase("idle");
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !deletePassword}
                  className="flex-1 rounded-lg bg-red-600 dark:bg-red-700 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 dark:hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      {showTotpModal && (
        <TotpModal onClose={() => setShowTotpModal(false)} onEnabled={() => setTotpEnabled(true)} />
      )}
    </div>
  );
}
