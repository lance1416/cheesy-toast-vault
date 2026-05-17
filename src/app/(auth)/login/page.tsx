"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-amber-50 flex items-center justify-center px-4 py-12"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 select-none">🧀</span>
          <h1
            className="text-[1.75rem] font-bold text-stone-800 leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Cheesy Toast Vault
          </h1>
          <p className="text-sm text-stone-400 mt-1.5 tracking-wide">
            Your secrets, kept warm &amp; safe.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm shadow-stone-100 px-8 py-8">
          <p className="text-[0.8rem] font-semibold text-stone-400 uppercase tracking-widest mb-6">
            Open your vault
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-500 tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-500 tracking-wide">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your master password"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-stone-800 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Unlocking…" : "Open Vault"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-400">
          No vault yet?{" "}
          <Link
            href="/register"
            className="font-medium text-amber-700 transition hover:text-amber-800"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
