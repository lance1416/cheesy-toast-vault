"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { EyeIcon } from "@/components/icons";
import { passwordStrength } from "@/lib/crypto";

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
      <div
        role="alert"
        className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        This link is invalid.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new one.
        </Link>
      </div>
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
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={12}
            autoFocus
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 12 characters"
            className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 pr-10 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors"
          >
            <EyeIcon open={showPassword} size={15} />
          </button>
        </div>
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
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}{" "}
          {error.includes("expired") && (
            <Link href="/forgot-password" className="underline">
              Request a new link.
            </Link>
          )}
        </div>
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
    <div
      className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 select-none" aria-hidden="true">
            🧀
          </span>
          <h1
            className="text-[1.75rem] font-bold text-default leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </h1>
          <p className="text-sm text-muted mt-1.5 tracking-wide">
            Your secrets, kept warm &amp; safe.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-line/60 px-8 py-8">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-6">
            Set new login password
          </p>
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/login"
            className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
