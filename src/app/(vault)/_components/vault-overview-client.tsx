"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useVault } from "@/context/vault";
import { decryptEntry } from "@/lib/crypto";
import { SearchIcon } from "@/components/icons";
import UserAvatar from "@/components/user-avatar";
import ThemeToggle from "@/components/theme-toggle";
import FooterApp from "@/components/footer-app";
import EntryCard from "./entry-card";
import CreateVaultModal from "./create-vault-modal";
import type { EntryPayload, EncryptedEntryProp, CrossVaultEntry } from "@/types/vault";

type RawVault = { id: string; name: string; entries: EncryptedEntryProp[] };

const PAGE_NOW = Date.now();
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeDay(date: Date): string {
  const days = -Math.round((PAGE_NOW - date.getTime()) / 86_400_000);
  return rtf.format(days, "day");
}

type VaultSummary = {
  id: string;
  name: string;
  updatedAt: Date;
  _count: { entries: number };
};

// ─── Vault card ───────────────────────────────────────────────────────────────

function VaultCard({
  vault,
  onNavigate,
  onRenamed,
  onDeleted,
}: {
  vault: VaultSummary;
  onNavigate: () => void;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(vault.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  function openRename() {
    setEditName(vault.name);
    setMenuOpen(false);
    setRenaming(true);
  }

  function cancelRename() {
    setRenaming(false);
    setEditName(vault.name);
    setError("");
  }

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === vault.name) {
      cancelRename();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/vaults/${vault.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to rename");
        setRenaming(false);
        setEditName(vault.name);
      } else {
        onRenamed(trimmed);
        setRenaming(false);
      }
    } catch {
      setError("Failed to rename");
      cancelRename();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/vaults/${vault.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted();
    } catch {
      setError("Failed to delete");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-line/60 overflow-hidden">
      {/* Main card body */}
      <div
        className="p-5 cursor-pointer hover:bg-sunken/30 transition-colors group"
        onClick={() => {
          if (!renaming && !menuOpen && !confirmDelete) onNavigate();
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          {renaming ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleRename();
                }
                if (e.key === "Escape") cancelRename();
              }}
              onBlur={() => void handleRename()}
              onClick={(e) => e.stopPropagation()}
              disabled={saving}
              className="flex-1 text-base font-semibold bg-transparent border-b-2 border-amber-400 outline-none text-default"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
              aria-label="Vault name"
            />
          ) : (
            <h2
              className="text-base font-semibold text-default group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              {vault.name}
            </h2>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
              setConfirmDelete(false);
            }}
            aria-label="Vault options"
            aria-expanded={menuOpen}
            className="shrink-0 text-subtle hover:text-muted transition-colors p-0.5 rounded mt-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted">
            {vault._count.entries} {vault._count.entries === 1 ? "entry" : "entries"}
          </p>
          <p className="text-xs text-subtle">{relativeDay(new Date(vault.updatedAt))}</p>
        </div>
      </div>

      {/* Inline menu */}
      {menuOpen && !confirmDelete && (
        <div className="border-t border-divider px-3 py-2 flex gap-2">
          <button
            type="button"
            onClick={openRename}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm text-muted hover:text-default hover:bg-line transition-colors text-left"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(true);
              setMenuOpen(false);
            }}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="border-t border-divider px-4 py-3 space-y-2.5">
          <p className="text-sm text-default">
            Delete <span className="font-semibold">{vault.name}</span>?
            {vault._count.entries > 0 && (
              <span className="text-muted">
                {" "}
                This removes all {vault._count.entries}{" "}
                {vault._count.entries === 1 ? "entry" : "entries"}.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-lg border border-line py-1.5 text-sm font-medium text-muted hover:text-default hover:bg-line transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-600 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export default function VaultOverviewClient({ vaults: initialVaults }: { vaults: VaultSummary[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { keys } = useVault();
  const [vaults, setVaults] = useState<VaultSummary[]>(initialVaults);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Cross-vault search ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "ready" | { error: string }>(
    "idle",
  );
  const [rawVaults, setRawVaults] = useState<RawVault[]>([]);
  const [allDecrypted, setAllDecrypted] = useState<CrossVaultEntry[]>([]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (q.trim() && fetchState === "idle") {
      setFetchState("loading");
      fetch("/api/entries")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: { vaults: RawVault[] }) => {
          setRawVaults(data.vaults);
          setFetchState("ready");
        })
        .catch(() => setFetchState({ error: "Failed to load entries." }));
    }
  }

  // Decrypt entries for all currently-unlocked vaults whenever data or keys change
  useEffect(() => {
    const unlockedVaults = rawVaults.filter((v) => keys[v.id]);
    // Promise.all([]) resolves immediately to [] when no vaults are unlocked
    let cancelled = false;
    Promise.all(
      unlockedVaults.flatMap((v) =>
        v.entries.map(async (e) => {
          try {
            const payload = await decryptEntry<EntryPayload>(keys[v.id]!, e.encryptedBlob, e.iv);
            return {
              ...payload,
              id: e.id,
              tags: e.tags,
              updatedAt: e.updatedAt,
              vaultId: v.id,
              vaultName: v.name,
            } satisfies CrossVaultEntry;
          } catch {
            return null;
          }
        }),
      ),
    ).then((results) => {
      if (!cancelled) setAllDecrypted(results.filter((r): r is CrossVaultEntry => r !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [rawVaults, keys]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allDecrypted.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.url?.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q),
    );
  }, [allDecrypted, searchQuery]);

  const unlockedCount = rawVaults.filter((v) => keys[v.id]).length;

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  function handleRenamed(id: string, name: string) {
    setVaults((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  }

  function handleDeleted(id: string) {
    setVaults((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div
      className="min-h-screen bg-canvas flex flex-col"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-line/80">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Wordmark — emoji only on small screens */}
          <Link
            href="/vaults"
            aria-label="Cheesy Toast Vault"
            className="font-bold text-default tracking-tight hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            <span className="text-2xl sm:hidden" aria-hidden="true">
              🧀
            </span>
            <span className="hidden sm:inline text-base">
              <span aria-hidden="true">🧀 </span>Cheesy Toast Vault
            </span>
          </Link>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-stone-800 dark:bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              + New vault
            </button>
            <div className="w-px h-5 bg-line" role="separator" aria-hidden="true" />
            <UserAvatar />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="md:hidden p-2 -mr-1 rounded-lg text-muted hover:text-default hover:bg-line transition-colors"
          >
            {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* Mobile overlay — dims + blurs the page, menu card floats above */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden bg-canvas/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="fixed inset-x-3 top-[3.75rem] z-40 md:hidden rounded-2xl bg-surface border border-line/50 shadow-2xl shadow-black/15 p-2 space-y-0.5"
            style={{ animation: "menu-in 0.15s ease-out" }}
          >
            {session?.user?.email && (
              <p className="px-3 py-2 text-xs text-subtle truncate border-b border-line/40 pb-2 mb-1">
                {session.user.email}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-stone-800 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              + New vault
            </button>
            <div className="h-px bg-line/50 my-1 mx-1" />
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-muted hover:text-default hover:bg-sunken rounded-xl transition-colors"
            >
              Settings
            </Link>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="h-px bg-line/50 my-1 mx-1" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Sign out
            </button>
          </nav>
        </>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search bar — shown when there are vaults to search */}
        {vaults.length > 0 && (
          <div className="mb-6">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">
                <SearchIcon />
              </span>
              <label htmlFor="cross-vault-search" className="sr-only">
                Search across unlocked vaults
              </label>
              <input
                id="cross-vault-search"
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search across unlocked vaults…"
                className="w-full rounded-lg border border-line/60 bg-surface pl-9 pr-4 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </div>
        )}

        {searchQuery.trim() ? (
          // ── Search results ────────────────────────────────────────────────────
          <div>
            {fetchState === "loading" && (
              <p className="text-sm text-muted py-8 text-center">Searching…</p>
            )}
            {typeof fetchState === "object" && "error" in fetchState && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 py-8 text-center">
                {fetchState.error}
              </p>
            )}
            {fetchState === "ready" && unlockedCount === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-muted mb-1">No unlocked vaults.</p>
                <p className="text-xs text-subtle">Open a vault first to include it in search.</p>
              </div>
            )}
            {fetchState === "ready" && unlockedCount > 0 && searchResults.length === 0 && (
              <p className="text-sm text-muted py-8 text-center">No entries match your search.</p>
            )}
            {fetchState === "ready" && searchResults.length > 0 && (
              <>
                <p className="text-xs text-subtle mb-3">
                  {searchResults.length} {searchResults.length === 1 ? "result" : "results"} across{" "}
                  {unlockedCount} {unlockedCount === 1 ? "vault" : "vaults"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                  {searchResults.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      vaultName={entry.vaultName}
                      onEdit={() => router.push(`/vault/${entry.vaultId}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : vaults.length === 0 ? (
          // ── Empty state ───────────────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-5 select-none" aria-hidden="true">
              🔐
            </span>
            <h2
              className="text-xl font-semibold text-default mb-2"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              No vaults yet
            </h2>
            <p className="text-sm text-muted mb-6">Create your first vault to get started.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              + Create vault
            </button>
          </div>
        ) : (
          // ── Vault grid ────────────────────────────────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onNavigate={() => router.push(`/vault/${vault.id}`)}
                onRenamed={(name) => handleRenamed(vault.id, name)}
                onDeleted={() => handleDeleted(vault.id)}
              />
            ))}
          </div>
        )}
      </main>

      <FooterApp />

      {showCreate && (
        <CreateVaultModal
          onClose={() => setShowCreate(false)}
          onCreated={(vaultId) => {
            setShowCreate(false);
            router.push(`/vault/${vaultId}`);
          }}
        />
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
