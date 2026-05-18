"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { generateSalt, bufferToBase64 } from "@/lib/crypto";
import { EyeIcon } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordShort = password.length > 0 && password.length < 12;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const salt = generateSalt();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, salt: bufferToBase64(salt) }),
      });

      if (res.status === 409) {
        setError("An account with this email already exists.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created but sign-in failed. Please log in.");
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
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 select-none" aria-hidden="true">
            🧀
          </span>
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

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm shadow-stone-100 px-8 py-8">
          <p className="text-[0.8rem] font-semibold text-stone-400 uppercase tracking-widest mb-6">
            Create your vault
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="block text-xs font-medium text-stone-500 tracking-wide"
              >
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="block text-xs font-medium text-stone-500 tracking-wide"
              >
                Master Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-500 transition-colors"
                >
                  <EyeIcon open={showPassword} size={15} />
                </button>
              </div>
              {passwordShort && (
                <p className="text-xs text-amber-600">
                  {12 - password.length} more character{12 - password.length !== 1 ? "s" : ""}{" "}
                  needed
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm"
                className="block text-xs font-medium text-stone-500 tracking-wide"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 placeholder:text-stone-300 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-pressed={showConfirm}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-500 transition-colors"
                >
                  <EyeIcon open={showConfirm} size={15} />
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
              {loading ? "Creating your vault…" : "Create Vault"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-400">
          Already have a vault?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 transition hover:text-amber-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
