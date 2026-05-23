"use client";

import { useState } from "react";
import { EyeIcon } from "@/components/icons";
import AlertBanner from "@/components/alert-banner";
import VaultHeader from "./vault-header";

function ShieldLockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M10 10V8.5a2 2 0 014 0V10" />
    </svg>
  );
}

export default function LockScreen({
  vaultName,
  onUnlock,
  error,
  loading,
}: {
  vaultName?: string;
  onUnlock: (password: string) => void;
  error: string;
  loading: boolean;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div
      className="bg-canvas flex flex-col min-h-full"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      {/* Mobile-only nav — sidebar handles desktop */}
      <div className="md:hidden">
        <VaultHeader vaultName={vaultName ?? "Vault"} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-line/60 text-stone-500 dark:text-stone-400 mb-5 shadow-sm">
              <ShieldLockIcon />
            </div>
            <h1
              className="text-xl font-semibold text-default mb-1.5"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              {vaultName ?? "Vault"}
            </h1>
            <p className="text-xs text-subtle">
              This vault is locked. Enter the password to continue.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUnlock(password);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="lock-password"
                className="block text-xs font-medium text-subtle tracking-wide uppercase"
              >
                Vault Password
              </label>
              <div className="relative">
                <input
                  id="lock-password"
                  type={show ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your vault password"
                  className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 pr-10 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-pressed={show}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-default transition-colors"
                >
                  <EyeIcon open={show} />
                </button>
              </div>
            </div>

            {error && <AlertBanner message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Unlocking…" : "Unlock vault"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-subtle">
            Decrypted locally — your password never leaves this device.
          </p>
        </div>
      </div>
    </div>
  );
}
