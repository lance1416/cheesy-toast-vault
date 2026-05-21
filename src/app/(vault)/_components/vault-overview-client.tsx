"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/user-avatar";
import FooterApp from "@/components/footer-app";
import CreateVaultModal from "./create-vault-modal";

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
  const [vaults, setVaults] = useState<VaultSummary[]>(initialVaults);
  const [showCreate, setShowCreate] = useState(false);

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
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/vaults"
            aria-label="Cheesy Toast Vault"
            className="text-base font-bold text-default tracking-tight hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            <span aria-hidden="true">🧀 </span>Cheesy Toast Vault
          </Link>
          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {vaults.length === 0 ? (
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
