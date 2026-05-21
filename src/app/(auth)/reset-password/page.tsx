"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AlertBanner from "@/components/alert-banner";
import PasswordInput from "../password-input";
import StrengthBar from "@/components/strength-bar";
import AuthShell from "../auth-shell";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = !!token && newPassword.length >= 12 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AlertBanner>
        This link is invalid.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new one.
        </Link>
      </AlertBanner>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          Password updated. You can now sign in with your new password.
        </div>
        <Link
          href="/login"
          className="block w-full text-center rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="block text-xs font-medium text-muted tracking-wide"
        >
          New login password
        </label>
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="At least 12 characters"
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          minLength={12}
          autoFocus
        />
        {newPassword && <StrengthBar password={newPassword} />}
        <p className="text-xs text-muted mt-1">Minimum 12 characters.</p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="block text-xs font-medium text-muted tracking-wide"
        >
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
        />
        {mismatch && (
          <p className="text-xs text-red-500 dark:text-red-400" role="alert">
            Passwords do not match.
          </p>
        )}
      </div>

      {error && (
        <AlertBanner>
          {error}{" "}
          {error.includes("expired") && (
            <Link href="/forgot-password" className="underline">
              Request a new link.
            </Link>
          )}
        </AlertBanner>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      cardLabel="Set new login password"
      footer={
        <Link
          href="/login"
          className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
        >
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
