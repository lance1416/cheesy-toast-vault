"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useVault } from "@/lib/vault-context";
import { deriveCryptoKey, decryptEntry, base64ToBuffer } from "@/lib/crypto";
import NewEntryModal from "./new-entry-modal";
import EditEntryModal from "./edit-entry-modal";
import ManageTagsModal from "./manage-tags-modal";
import type { Tag } from "./tag-selector";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryPayload = {
  name: string;
  url?: string;
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
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
      {copied ? <span className="text-xs font-medium text-amber-600">✓</span> : <CopyIcon />}
    </button>
  );
}

// ─── Favicon ─────────────────────────────────────────────────────────────────

function LetterAvatar({ name }: { name: string }) {
  return (
    <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-xs font-semibold text-stone-400 shrink-0 select-none">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function Favicon({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }, [url]);

  if (!domain || failed) return <LetterAvatar name={name} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      alt=""
      width={24}
      height={24}
      className="w-6 h-6 rounded-md object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onEdit }: { entry: DecryptedEntry; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
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

  const displayHost = useMemo(() => {
    if (!entry.url) return null;
    try {
      return new URL(entry.url).hostname.replace(/^www\./, "");
    } catch {
      return entry.url;
    }
  }, [entry.url]);

  return (
    <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm shadow-stone-100 overflow-hidden">
      {/* Header — always visible, click anywhere to expand/collapse */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {entry.url ? (
          <Favicon url={entry.url} name={entry.name} />
        ) : (
          <LetterAvatar name={entry.name} />
        )}

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-stone-800 leading-snug truncate"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            {entry.name}
          </p>
          {displayHost && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-stone-500 hover:text-amber-600 transition-colors truncate inline-block max-w-full leading-none mt-0.5"
            >
              {displayHost}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-xs font-medium text-stone-400 hover:text-amber-700 transition-colors"
          >
            Edit
          </button>
          <span className="text-stone-400">
            <ChevronIcon open={open} />
          </span>
        </div>
      </div>

      {/* Body — collapsible */}
      {open && (
        <div className="px-4 pt-3 pb-4 border-t border-stone-100 space-y-2">
          {/* Inline field rows: label | value | action */}
          {[
            {
              label: "Username",
              value: entry.username,
              actions: <CopyButton value={entry.username} />,
            },
            { label: "Email", value: entry.email, actions: <CopyButton value={entry.email} /> },
            {
              label: "Password",
              value: showPassword ? entry.password : "••••••••",
              mono: true,
              actions: (
                <div className="flex items-center gap-2">
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
              ),
            },
          ].map(({ label, value, mono, actions }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-stone-400">{label}</span>
              <span className={`flex-1 truncate text-sm text-stone-700 ${mono ? "font-mono" : ""}`}>
                {value}
              </span>
              <div className="shrink-0">{actions}</div>
            </div>
          ))}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-100">
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <span className="text-xs text-stone-400 shrink-0 ml-2">{formattedDate}</span>
          </div>
        </div>
      )}
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
  tags: initialTags,
}: {
  email: string;
  salt: string;
  entries: EncryptedEntryProp[];
  tags: Tag[];
}) {
  const router = useRouter();
  const { cryptoKey, setCryptoKey } = useVault();
  const [decrypted, setDecrypted] = useState<DecryptedEntry[] | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EncryptedEntryProp | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>(initialTags);
  const [query, setQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showManageTags, setShowManageTags] = useState(false);

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

  const filtered = useMemo(() => {
    if (!decrypted) return [];
    let result = decrypted;
    if (selectedTagIds.length > 0) {
      result = result.filter((e) => e.tags.some((t) => selectedTagIds.includes(t.id)));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.url?.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q),
      );
    }
    return result;
  }, [decrypted, query, selectedTagIds]);

  function toggleTagFilter(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleTagCreated(tag: Tag) {
    setAllTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev;
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function handleTagUpdated(tag: Tag) {
    setAllTags((prev) =>
      prev.map((t) => (t.id === tag.id ? tag : t)).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  function handleTagDeleted(id: string) {
    setAllTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagIds((prev) => prev.filter((x) => x !== id));
  }

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
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
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
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-stone-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Add entry
            </button>
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
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {decrypted.length > 0 && (
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries…"
                className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* Tag filter chips */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        active
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-white text-stone-500 border-stone-200 hover:border-amber-300 hover:text-amber-700"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {selectedTagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTagIds([])}
                    className="rounded-full px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowManageTags(true)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label="Manage tags"
                >
                  Edit tags
                </button>
              </div>
            )}
          </div>
        )}

        {decrypted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-5 select-none">🗝️</span>
            <h2
              className="text-xl font-semibold text-stone-700 mb-2"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Your vault is empty
            </h2>
            <p className="text-sm text-stone-400 mb-6">Add your first entry to get started.</p>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Add your first entry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-stone-500 text-sm mb-3">No entries match your search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedTagIds([]);
              }}
              className="text-xs text-amber-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => setEditingEntry(entries.find((e) => e.id === entry.id) ?? null)}
              />
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewEntryModal
          cryptoKey={cryptoKey}
          tags={allTags}
          onTagCreated={handleTagCreated}
          onClose={() => setShowNew(false)}
          onSuccess={() => {
            setShowNew(false);
            router.refresh();
          }}
        />
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          cryptoKey={cryptoKey}
          tags={allTags}
          onTagCreated={handleTagCreated}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => {
            setEditingEntry(null);
            router.refresh();
          }}
        />
      )}

      {showManageTags && (
        <ManageTagsModal
          tags={allTags}
          onClose={() => setShowManageTags(false)}
          onTagUpdated={handleTagUpdated}
          onTagDeleted={handleTagDeleted}
        />
      )}
    </div>
  );
}
