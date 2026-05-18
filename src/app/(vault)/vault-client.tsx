"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useVault } from "@/lib/vault-context";
import { deriveCryptoKey, decryptEntry, base64ToBuffer } from "@/lib/crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryPayload = {
  site: string;
  username: string;
  email: string;
  password: string;
};

type EncryptedEntryProp = {
  id: string;
  encryptedBlob: string;
  iv: string;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

type DecryptedEntry = EntryPayload & {
  id: string;
  tags: { id: string; name: string }[];
  updatedAt: string;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
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
      width="13"
      height="13"
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

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-stone-300 hover:text-amber-600 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <span className="text-[10px] font-medium text-amber-600">✓</span> : <CopyIcon />}
    </button>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: DecryptedEntry }) {
  const [showPassword, setShowPassword] = useState(false);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(entry.updatedAt)),
    [entry.updatedAt],
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm shadow-stone-100 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h2
          className="text-base font-semibold text-stone-800 leading-snug break-all"
          style={{ fontFamily: "var(--font-playfair, serif)" }}
        >
          {entry.site}
        </h2>
        <Link
          href={`/${entry.id}/edit`}
          className="shrink-0 text-xs font-medium text-stone-400 hover:text-amber-700 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Fields */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Username
            </span>
            <p className="text-stone-700 truncate">{entry.username}</p>
          </div>
          <CopyButton value={entry.username} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Email
            </span>
            <p className="text-stone-700 truncate">{entry.email}</p>
          </div>
          <CopyButton value={entry.email} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Password
            </span>
            <p className="text-stone-700 font-mono tracking-widest">
              {showPassword ? entry.password : "••••••••••••"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-stone-300 hover:text-stone-500 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
            <CopyButton value={entry.password} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-stone-100">
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-stone-400 shrink-0 ml-2">{formattedDate}</span>
      </div>
    </div>
  );
}

// ─── Lock screen ──────────────────────────────────────────────────────────────

function LockScreen({
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
          <span className="text-5xl block mb-4 select-none">🔐</span>
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
              <label className="block text-xs font-medium text-stone-500 tracking-wide">
                Master Password
              </label>
              <div className="relative">
                <input
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={show} />
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
              {loading ? "Unlocking…" : "Unlock Vault"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VaultClient({
  email,
  salt,
  entries,
}: {
  email: string;
  salt: string;
  entries: EncryptedEntryProp[];
}) {
  const { cryptoKey, setCryptoKey } = useVault();
  const [decrypted, setDecrypted] = useState<DecryptedEntry[] | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // Re-decrypt whenever the key or the entries list changes.
  useEffect(() => {
    if (!cryptoKey) return;

    let cancelled = false;

    Promise.all(
      entries.map(async (e) => {
        const payload = await decryptEntry<EntryPayload>(cryptoKey, e.encryptedBlob, e.iv);
        return { ...payload, id: e.id, tags: e.tags, updatedAt: e.updatedAt };
      }),
    )
      .then((results) => {
        if (!cancelled) setDecrypted(results);
      })
      .catch(() => {
        if (!cancelled) setUnlockError("Failed to decrypt entries. Try signing out and back in.");
      });

    return () => {
      cancelled = true;
    };
  }, [cryptoKey, entries]);

  async function handleUnlock(password: string) {
    setUnlockError("");
    setUnlocking(true);

    try {
      const key = await deriveCryptoKey(password, base64ToBuffer(salt));

      // Validate password by attempting one real decryption before committing.
      if (entries.length > 0) {
        await decryptEntry(key, entries[0].encryptedBlob, entries[0].iv);
      }

      setCryptoKey(key); // triggers useEffect to decrypt all
    } catch (err) {
      const isDomError = err instanceof DOMException && err.name === "OperationError";
      setUnlockError(
        isDomError ? "Incorrect master password." : "Something went wrong. Please try again.",
      );
    } finally {
      setUnlocking(false);
    }
  }

  // ── Locked ──
  if (!cryptoKey || decrypted === null) {
    return (
      <LockScreen
        onUnlock={handleUnlock}
        error={unlockError}
        loading={unlocking || (!!cryptoKey && decrypted === null)}
      />
    );
  }

  // ── Unlocked ──
  return (
    <div
      className="min-h-screen bg-amber-50"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span
            className="text-lg font-bold text-stone-800 tracking-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            🧀 Cheesy Toast Vault
          </span>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-stone-400 truncate max-w-40">
              {email}
            </span>
            <Link
              href="/new"
              className="rounded-lg bg-stone-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Add entry
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {decrypted.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-5 select-none">🗝️</span>
            <h2
              className="text-xl font-semibold text-stone-700 mb-2"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Your vault is empty
            </h2>
            <p className="text-sm text-stone-400 mb-6">Add your first entry to get started.</p>
            <Link
              href="/new"
              className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Add your first entry
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decrypted.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
