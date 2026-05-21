"use client";

import { useState } from "react";
import Link from "next/link";
import AlertBanner from "@/components/alert-banner";
import PasswordInput from "../password-input";
import AuthShell from "../auth-shell";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginConfirm, setLoginConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const loginShort = loginPassword.length > 0 && loginPassword.length < 12;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (loginPassword !== loginConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, loginPassword }),
      });

      if (res.status === 409) {
        setError("An account with this email already exists.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setRegistered(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <AuthShell cardLabel="Check your email">
        <div className="space-y-4 text-center py-2">
          <span className="text-4xl block select-none" aria-hidden="true">
            📬
          </span>
          <p className="text-sm text-muted">
            We sent a verification link to <span className="font-medium text-default">{email}</span>
            . Click the link to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      cardLabel="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="register-email"
            className="block text-xs font-medium text-muted tracking-wide"
          >
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-xs font-medium text-muted tracking-wide"
          >
            Password
          </label>
          <PasswordInput
            id="login-password"
            value={loginPassword}
            onChange={setLoginPassword}
            placeholder="At least 12 characters"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            minLength={12}
          />
          {loginShort && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {12 - loginPassword.length} more character
              {12 - loginPassword.length !== 1 ? "s" : ""} needed
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-confirm"
            className="block text-xs font-medium text-muted tracking-wide"
          >
            Confirm password
          </label>
          <PasswordInput
            id="login-confirm"
            value={loginConfirm}
            onChange={setLoginConfirm}
            placeholder="Repeat password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        </div>

        {error && <AlertBanner message={error} />}

        <button
          type="submit"
          disabled={
            loading || !email || loginPassword.length < 12 || loginPassword !== loginConfirm
          }
          className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
