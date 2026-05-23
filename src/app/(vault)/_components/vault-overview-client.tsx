"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { SearchIcon } from "@/components/icons";
import ThemeToggle from "@/components/theme-toggle";
import FooterApp from "@/components/footer-app";
import VaultCard from "./vault-card";
import EntryCard from "./entry-card";
import CreateVaultModal from "./create-vault-modal";
import KeyboardShortcutHelp from "./keyboard-shortcut-help";
import { useCrossVaultSearch } from "./use-cross-vault-search";
import HealthDashboard from "./health-dashboard";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import type { VaultSummary } from "./vault-card";
import type { CustomEntryTypeDef } from "@/types/vault";

export default function VaultOverviewClient({ vaults: initialVaults }: { vaults: VaultSummary[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [vaults, setVaults] = useState<VaultSummary[]>(initialVaults);
  const [showCreate, setShowCreate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customTypes, setCustomTypes] = useState<CustomEntryTypeDef[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/entry-types")
      .then((r) => r.json() as Promise<{ types: CustomEntryTypeDef[] }>)
      .then((d) => setCustomTypes(d.types ?? []))
      .catch(() => {});
  }, []);

  const { searchQuery, setSearchQuery, fetchState, searchResults, unlockedCount, rawVaults, keys } =
    useCrossVaultSearch();

  useKeyboardShortcuts(
    {
      "/": () => searchRef.current?.focus(),
      n: () => setShowCreate(true),
      "?": () => setShowHelp(true),
    },
    showCreate || showHelp,
  );

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
      className="bg-canvas flex flex-col min-h-full"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      {/* Mobile-only header — sidebar handles desktop nav */}
      <div className="md:hidden">
        <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-line/80">
          <div className="w-full px-4 h-14 flex items-center justify-between gap-4">
            <Link
              href="/vaults"
              aria-label="Cheesy Toast Vault"
              className="font-bold text-default tracking-tight hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              <span className="text-2xl" aria-hidden="true">
                🧀
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="p-2 -mr-1 rounded-lg text-muted hover:text-default hover:bg-line transition-colors"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-canvas/60 backdrop-blur-sm"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav
              className="fixed inset-x-3 top-[3.75rem] z-40 rounded-2xl bg-surface border border-line/50 shadow-2xl shadow-black/15 p-2 space-y-0.5"
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
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search bar — shown when there are vaults to search */}
        {vaults.length > 0 && (
          <div className="relative mb-6">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">
              <SearchIcon />
            </span>
            <label htmlFor="cross-vault-search" className="sr-only">
              Search across unlocked vaults
            </label>
            <input
              id="cross-vault-search"
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across unlocked vaults…"
              className="w-full rounded-lg border border-line/60 bg-surface pl-9 pr-4 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        )}

        {/* Health dashboard — shown when at least one vault is unlocked and not searching */}
        {unlockedCount > 0 && !searchQuery.trim() && (
          <HealthDashboard rawVaults={rawVaults} keys={keys} />
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
                <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
                  <ul className="divide-y divide-divider">
                    {searchResults.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        vaultName={entry.vaultName}
                        onEdit={() => router.push(`/vault/${entry.vaultId}`)}
                        customTypes={customTypes}
                      />
                    ))}
                  </ul>
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
      {showHelp && <KeyboardShortcutHelp onClose={() => setShowHelp(false)} />}
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
