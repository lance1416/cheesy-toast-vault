"use client";

import { useState } from "react";
import { EyeIcon } from "@/components/icons";

export default function LockScreen({
  onUnlock,
  error,
  loading,
}: {
  onUnlock: (password: string) => void;
  error: string;
  loading: boolean;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div
      className="min-h-screen bg-amber-50 flex items-center justify-center px-4 py-12"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 select-none" aria-hidden="true">
            🔐
          </span>
          <h1
            className="text-[1.75rem] font-bold text-stone-800 leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </h1>
          <p className="text-sm text-stone-400 mt-1.5">Enter your master password to unlock.</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm shadow-stone-100 px-8 py-8">
          <p className="text-[0.8rem] font-semibold text-stone-400 uppercase tracking-widest mb-6">
            Unlock your vault
          </p>

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
                className="block text-xs font-medium text-stone-500 tracking-wide"
              >
                Master Password
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
                  placeholder="Your master password"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-pressed={show}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-500 transition-colors"
                >
                  <EyeIcon open={show} />
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-stone-800 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Unlocking…" : "Unlock Vault"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
