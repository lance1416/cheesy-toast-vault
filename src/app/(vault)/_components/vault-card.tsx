"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_NOW = Date.now();
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeDay(date: Date): string {
  const days = -Math.round((PAGE_NOW - date.getTime()) / 86_400_000);
  return rtf.format(days, "day");
}

function VaultLockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export type VaultSummary = {
  id: string;
  name: string;
  updatedAt: Date;
  _count: { entries: number };
};

export default function VaultCard({
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
    <div
      className={`bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-px transition-all group ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Main body */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => {
          if (!renaming && !menuOpen && !confirmDelete) onNavigate();
        }}
      >
        <div className="flex items-start gap-3">
          {/* Vault icon */}
          <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center shrink-0 text-muted group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mt-0.5">
            <VaultLockIcon />
          </div>

          {/* Name + metadata */}
          <div className="flex-1 min-w-0">
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
                className="w-full text-sm font-semibold bg-transparent border-b-2 border-amber-400 outline-none text-default pb-0.5"
                style={{ fontFamily: "var(--font-playfair, serif)" }}
                aria-label="Vault name"
              />
            ) : (
              <h2
                className="text-sm font-semibold text-default truncate leading-tight"
                style={{ fontFamily: "var(--font-playfair, serif)" }}
              >
                {vault.name}
              </h2>
            )}
            <p className="text-xs text-muted mt-1.5">
              {vault._count.entries} {vault._count.entries === 1 ? "entry" : "entries"}
              <span className="text-subtle mx-1.5" aria-hidden="true">
                ·
              </span>
              {relativeDay(new Date(vault.updatedAt))}
            </p>
          </div>

          {/* Options */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
              setConfirmDelete(false);
            }}
            aria-label="Vault options"
            aria-expanded={menuOpen}
            className="shrink-0 text-subtle hover:text-muted transition-colors p-1 rounded-lg hover:bg-sunken -mr-1 -mt-1"
          >
            <DotsIcon />
          </button>
        </div>
      </div>

      {/* Inline menu */}
      {menuOpen && !confirmDelete && (
        <div className="border-t border-divider px-3 py-2 flex gap-2">
          <button
            type="button"
            onClick={openRename}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm text-muted hover:text-default hover:bg-sunken transition-colors text-left"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(true);
              setMenuOpen(false);
            }}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
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
              className="flex-1 rounded-lg border border-line py-1.5 text-sm font-medium text-muted hover:text-default hover:bg-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
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
