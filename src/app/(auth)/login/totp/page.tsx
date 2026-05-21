"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import AuthShell from "../../auth-shell";

function TotpChallengeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/vaults";

  // useRef avoids setState-in-effect lint error and prevents a re-render from
  // clearing the token after sessionStorage.removeItem() runs in handleSubmit.
  const mfaTokenRef = useRef<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("mfaToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    mfaTokenRef.current = token;
    inputRef.current?.focus();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mfaToken = mfaTokenRef.current;
    if (!mfaToken) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        totpToken: mfaToken,
        totpCode: code.replace(/\s/g, ""),
        redirect: false,
        callbackUrl,
      });

      if (result?.error === "rate_limited") {
        setError("Too many attempts. Please wait a few minutes before trying again.");
        return;
      }
      if (result?.error) {
        setError("Invalid code. Please try again.");
        setCode("");
        return;
      }

      sessionStorage.removeItem("mfaToken");
      router.push(result?.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const trimmed = code.replace(/[\s-]/g, "");
  const isReady = trimmed.length === 6 || trimmed.length === 10; // TOTP or backup code

  return (
    <AuthShell
      cardLabel="Two-factor authentication"
      footer={
        <>
          <Link
            href="/login"
            className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
          >
            ← Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted">
          Enter the 6-digit code from your authenticator app. If you{"'"}ve lost access, use one of
          your backup codes.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="totp-code" className="block text-xs font-medium text-muted tracking-wide">
            Code
          </label>
          <input
            ref={inputRef}
            id="totp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000 000"
            className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface text-center tracking-[0.25em] font-mono"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isReady}
          className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function TotpPage() {
  return (
    <Suspense>
      <TotpChallengeForm />
    </Suspense>
  );
}
