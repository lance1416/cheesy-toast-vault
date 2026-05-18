"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { EyeIcon } from "@/components/icons";
import VaultHeader from "./vault-header";

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
      className="min-h-screen bg-canvas bg-noise flex flex-col"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
      }}
    >
      <VaultHeader
        vaultName={vaultName ?? "Vault"}
        actions={
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg px-3 py-2 text-sm text-subtle hover:text-default hover:bg-line transition-colors"
          >
            Sign out
          </button>
        }
      />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4 select-none" aria-hidden="true">
              🔐
            </span>
            <p className="text-sm text-muted">Enter the vault password to unlock.</p>
          </div>

          <div className="bg-surface rounded-2xl border border-line/80 shadow-sm shadow-black/5 px-8 py-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUnlock(password);
              }}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="lock-password"
                  className="block text-xs font-medium text-subtle tracking-wide"
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
                    placeholder="Your vault password"
                    className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 pr-10 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
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
                disabled={loading}
                className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
