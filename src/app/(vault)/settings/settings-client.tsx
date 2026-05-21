"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useVault } from "@/context/vault";
import Field from "@/components/field";
import StrengthBar from "@/components/strength-bar";
import VaultHeader from "../_components/vault-header";

const TIMEOUTS = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 0, label: "Never" },
] as const;

export default function SettingsClient() {
  const { lockTimeout, setLockTimeout } = useVault();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
        body: JSON.stringify({ currentPassword, newPassword }),
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

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

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
              {deleteError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                >
                  {deleteError}
                </div>
              )}
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
    </div>
  );
}
