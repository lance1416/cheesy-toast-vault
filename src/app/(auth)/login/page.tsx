"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import AlertBanner from "@/components/alert-banner";
import PasswordInput from "../password-input";
import AuthShell from "../auth-shell";

function LoginBanner() {
  const params = useSearchParams();
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);

  if (params.get("verified") === "1") {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400 mb-4"
      >
        Email verified. You can now sign in.
      </div>
    );
  }

  if (params.get("verifyError") === "1") {
    return (
      <AlertBanner className="mb-4">
        Verification link is invalid or already used.{" "}
        <Link href="/login?unverified=1" className="underline">
          Resend?
        </Link>
      </AlertBanner>
    );
  }

  if (params.get("unverified") === "1") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 mb-4 space-y-2"
      >
        <p>Please verify your email before signing in.</p>
        {resendSent ? (
          <p className="text-xs">Verification email sent.</p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resendEmail }),
              });
              setResendSent(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-default outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Resend
            </button>
          </form>
        )}
      </div>
    );
  }

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const callbackUrl =
        new URLSearchParams(window.location.search).get("callbackUrl") ?? "/vaults";
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });

      if (result?.error === "rate_limited") {
        setError("Too many attempts. Please wait a few minutes before trying again.");
        return;
      }
      if (result?.error?.startsWith("mfa_required:")) {
        const token = result.error.slice("mfa_required:".length);
        sessionStorage.setItem("mfaToken", token);
        router.push(`/login/totp?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(result?.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      cardLabel="Open your vault"
      above={
        <Suspense>
          <LoginBanner />
        </Suspense>
      }
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-muted tracking-wide"
          >
            Email
          </label>
          <input
            id="login-email"
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
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-muted tracking-wide"
            >
              Login Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            placeholder="Your login password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete="current-password"
          />
        </div>

        {error && <AlertBanner message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Unlocking…" : "Open Vault"}
        </button>
      </form>
    </AuthShell>
  );
}
