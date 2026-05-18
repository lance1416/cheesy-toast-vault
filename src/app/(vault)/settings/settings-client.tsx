"use client";

import { useState } from "react";
import { passwordStrength } from "@/lib/crypto";
import Field from "@/components/field";
import VaultHeader from "../vault-header";

function StrengthBar({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  const colors = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-500", "bg-green-500"];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : "bg-line"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {label}
      </p>
    </div>
  );
}

export default function SettingsClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      className="min-h-screen bg-canvas bg-noise"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <VaultHeader vaultName="Settings" />

      <main className="max-w-lg mx-auto px-4 py-10">
        <h1
          className="text-2xl font-semibold text-default mb-8"
          style={{ fontFamily: "var(--font-playfair, serif)" }}
        >
          Account Settings
        </h1>

        <section className="bg-surface rounded-xl border border-line/80 shadow-sm shadow-black/5 p-6">
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
      </main>
    </div>
  );
}
