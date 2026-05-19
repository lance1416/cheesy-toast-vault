"use client";

import { useState } from "react";
import Link from "next/link";
import { generateSalt, bufferToBase64, deriveCryptoKey } from "@/lib/crypto";
import { EyeIcon } from "@/components/icons";
import { useVault } from "@/lib/vault-context";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 pr-10 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={show}
        aria-label={show ? "Hide" : "Show"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors"
      >
        <EyeIcon open={show} size={15} />
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const { setKey } = useVault();

  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginConfirm, setLoginConfirm] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultConfirm, setVaultConfirm] = useState("");
  const [vaultName, setVaultName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [vaultWarningAck, setVaultWarningAck] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const loginShort = loginPassword.length > 0 && loginPassword.length < 12;
  const vaultShort = vaultPassword.length > 0 && vaultPassword.length < 12;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (loginPassword !== loginConfirm) {
      setError("Login passwords do not match.");
      return;
    }
    if (vaultPassword !== vaultConfirm) {
      setError("Vault passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const salt = generateSalt();
      const saltB64 = bufferToBase64(salt);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          loginPassword,
          vaultSalt: saltB64,
          vaultName: vaultName || "Personal",
        }),
      });

      if (res.status === 409) {
        setError("An account with this email already exists.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      // Pre-derive the vault key into context so it's ready after email verification
      const { vaultId } = (await res.json()) as { vaultId: string };
      const key = await deriveCryptoKey(vaultPassword, salt);
      setKey(vaultId, key);

      setRegistered(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
      }}
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

        {registered ? (
          <div className="bg-surface rounded-xl border border-line/60 px-8 py-8 space-y-4 text-center">
            <span className="text-4xl block select-none" aria-hidden="true">
              📬
            </span>
            <h2
              className="text-lg font-semibold text-default"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Check your email
            </h2>
            <p className="text-sm text-muted">
              We sent a verification link to{" "}
              <span className="font-medium text-default">{email}</span>. Click the link to activate
              your account, then sign in.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-line/60 px-8 py-8">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-6">
              Create your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface"
                />
              </div>

              {/* Login credentials section */}
              <div className="space-y-3 rounded-lg border border-divider bg-sunken/50 p-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Login credentials
                </p>
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-muted tracking-wide"
                  >
                    Login Password{" "}
                    <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
                      *
                    </span>
                  </label>
                  <PasswordInput
                    id="login-password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    placeholder="At least 12 characters"
                    show={showLogin}
                    onToggle={() => setShowLogin((v) => !v)}
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
                    Confirm Login Password{" "}
                    <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
                      *
                    </span>
                  </label>
                  <PasswordInput
                    id="login-confirm"
                    value={loginConfirm}
                    onChange={setLoginConfirm}
                    placeholder="Repeat login password"
                    show={showLogin}
                    onToggle={() => setShowLogin((v) => !v)}
                  />
                </div>
              </div>

              {/* Vault section */}
              <div className="space-y-3 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Vault encryption password
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/20 px-3.5 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">Your vault password encrypts all stored data.</p>
                  <p>
                    It is <span className="font-semibold">never sent to our servers</span> — if you
                    forget it, your vault data{" "}
                    <span className="font-semibold">cannot be recovered</span>. Write it down
                    somewhere safe.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="vault-name-input"
                    className="block text-xs font-medium text-muted tracking-wide"
                  >
                    Vault Name
                  </label>
                  <input
                    id="vault-name-input"
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="Personal"
                    className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="vault-password"
                    className="block text-xs font-medium text-muted tracking-wide"
                  >
                    Vault Password{" "}
                    <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
                      *
                    </span>
                  </label>
                  <PasswordInput
                    id="vault-password"
                    value={vaultPassword}
                    onChange={setVaultPassword}
                    placeholder="At least 12 characters"
                    show={showVault}
                    onToggle={() => setShowVault((v) => !v)}
                    minLength={12}
                  />
                  {vaultShort && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {12 - vaultPassword.length} more character
                      {12 - vaultPassword.length !== 1 ? "s" : ""} needed
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="vault-confirm"
                    className="block text-xs font-medium text-muted tracking-wide"
                  >
                    Confirm Vault Password{" "}
                    <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
                      *
                    </span>
                  </label>
                  <PasswordInput
                    id="vault-confirm"
                    value={vaultConfirm}
                    onChange={setVaultConfirm}
                    placeholder="Repeat vault password"
                    show={showVault}
                    onToggle={() => setShowVault((v) => !v)}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={vaultWarningAck}
                  onChange={(e) => setVaultWarningAck(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-amber-600"
                />
                <span className="text-xs text-muted leading-relaxed">
                  I understand that my vault password{" "}
                  <span className="font-semibold text-default">cannot be recovered</span> if lost.
                </span>
              </label>

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
                disabled={
                  loading ||
                  !email ||
                  loginPassword.length < 12 ||
                  loginPassword !== loginConfirm ||
                  vaultPassword.length < 12 ||
                  vaultPassword !== vaultConfirm ||
                  !vaultWarningAck
                }
                className="w-full rounded-lg bg-stone-800 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating your account…" : "Create Account"}
              </button>
            </form>
          </div>
        )}

        {!registered && (
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-amber-700 dark:text-amber-400 transition hover:text-amber-800 dark:hover:text-amber-300"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
