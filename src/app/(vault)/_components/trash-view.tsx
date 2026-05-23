"use client";

import { useEffect, useState } from "react";
import { decryptEntry } from "@/lib/crypto";
import { TrashIcon } from "@/components/icons";
import type { EntryPayload, CustomEntryTypeDef } from "@/types/vault";
import { BUILTIN_ENTRY_TYPES as BUILTINS } from "@/types/vault";

const PURGE_DAYS = 30;

type TrashedRaw = {
  id: string;
  encryptedBlob: string;
  iv: string;
  entryType: string;
  deletedAt: string;
  tags: { id: string; name: string }[];
};

type TrashedEntry = TrashedRaw & { name: string };

function purgeInfo(deletedAt: string): { label: string; urgent: boolean } {
  const daysGone = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000);
  const remaining = PURGE_DAYS - daysGone;
  if (remaining <= 0) return { label: "Pending permanent deletion", urgent: true };
  if (remaining === 1) return { label: "Permanently deleted tomorrow", urgent: true };
  if (remaining <= 7) return { label: `Permanently deleted in ${remaining} days`, urgent: true };
  return { label: `Permanently deleted in ${remaining} days`, urgent: false };
}

function deletedAgo(deletedAt: string): string {
  const daysGone = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000);
  if (daysGone === 0) return "Deleted today";
  if (daysGone === 1) return "Deleted yesterday";
  return `Deleted ${daysGone} days ago`;
}

function entryTypeLabel(entryType: string, customTypes: CustomEntryTypeDef[]): string {
  if (entryType === "login") return "Login";
  if (entryType === "note") return "Note";
  if (entryType === "card") return "Card";
  if (entryType === "identity") return "Identity";
  return customTypes.find((t) => t.id === entryType)?.name ?? "Custom";
}

// ─── Confirm-in-place delete forever ─────────────────────────────────────────

function DeleteForeverButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-red-500 dark:text-red-400">Delete forever?</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-muted hover:text-default transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      aria-label="Delete forever"
      title="Delete forever"
      className="text-subtle hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <TrashIcon />
    </button>
  );
}

// ─── Trash view ───────────────────────────────────────────────────────────────

export default function TrashView({
  vaultId,
  cryptoKey,
  onRestored,
  onCountKnown,
  customTypes = [],
}: {
  vaultId: string;
  cryptoKey: CryptoKey;
  onRestored: (id: string) => void;
  onCountKnown: (count: number) => void;
  customTypes?: CustomEntryTypeDef[];
}) {
  const [entries, setEntries] = useState<TrashedEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [emptyingTrash, setEmptyingTrash] = useState(false);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/vaults/${vaultId}/trash`);
        if (!res.ok) throw new Error();
        const { entries: raw } = (await res.json()) as { entries: TrashedRaw[] };

        const decrypted = await Promise.all(
          raw.map(async (e) => {
            try {
              const payload = await decryptEntry<EntryPayload>(cryptoKey, e.encryptedBlob, e.iv);
              return { ...e, name: payload.name };
            } catch {
              return { ...e, name: "[Encrypted entry]" };
            }
          }),
        );

        if (!cancelled) {
          setEntries(decrypted);
          onCountKnown(decrypted.length);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [vaultId, cryptoKey, onCountKnown]);

  async function handleRestore(id: string) {
    setPendingRestore((s) => new Set(s).add(id));
    try {
      await fetch(`/api/vault/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? prev);
      onRestored(id);
    } finally {
      setPendingRestore((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function handleDeleteForever(id: string) {
    setPendingDelete((s) => new Set(s).add(id));
    try {
      await fetch(`/api/vault/${id}?permanent=1`, { method: "DELETE" });
      const updated = entries?.filter((e) => e.id !== id) ?? [];
      setEntries(updated);
      onCountKnown(updated.length);
    } finally {
      setPendingDelete((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function handleEmptyTrash() {
    if (!entries?.length) return;
    setEmptyingTrash(true);
    try {
      await Promise.all(
        entries.map((e) => fetch(`/api/vault/${e.id}?permanent=1`, { method: "DELETE" })),
      );
      setEntries([]);
      onCountKnown(0);
      setConfirmEmptyAll(false);
    } finally {
      setEmptyingTrash(false);
    }
  }

  async function handleRestoreAll() {
    if (!entries?.length) return;
    const all = [...entries];
    setEntries([]);
    await Promise.all(
      all.map((e) =>
        fetch(`/api/vault/${e.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true }),
        }),
      ),
    );
    onCountKnown(0);
    all.forEach((e) => onRestored(e.id));
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">Failed to load trash.</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            setEntries(null);
          }}
          className="mt-3 text-xs text-amber-700 dark:text-amber-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted animate-pulse">Loading trash…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4 text-muted">
          <TrashIcon />
        </div>
        <p className="text-sm font-medium text-default mb-1">Trash is empty</p>
        <p className="text-xs text-muted">Deleted entries are kept here for {PURGE_DAYS} days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted">
          {entries.length} {entries.length === 1 ? "item" : "items"} · Entries are permanently
          deleted after {PURGE_DAYS} days
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRestoreAll()}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-default hover:bg-sunken transition-colors"
          >
            Restore all
          </button>
          {!confirmEmptyAll ? (
            <button
              type="button"
              onClick={() => setConfirmEmptyAll(true)}
              className="rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Empty trash
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400">
                Delete all {entries.length}?
              </span>
              <button
                type="button"
                onClick={() => void handleEmptyTrash()}
                disabled={emptyingTrash}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {emptyingTrash ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmptyAll(false)}
                className="text-xs text-muted hover:text-default transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entry list */}
      <ul className="space-y-2">
        {entries.map((entry) => {
          const restoring = pendingRestore.has(entry.id);
          const deleting = pendingDelete.has(entry.id);
          const busy = restoring || deleting;
          const { label: purgeLabel, urgent } = purgeInfo(entry.deletedAt);
          const typeLabel = entryTypeLabel(entry.entryType, customTypes);
          const isCustom = !BUILTINS.includes(entry.entryType);

          return (
            <li
              key={entry.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 bg-surface transition-opacity ${busy ? "opacity-50" : ""} ${urgent ? "border-red-200 dark:border-red-900/50" : "border-line/60"}`}
            >
              {/* Type badge */}
              <span
                className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                  isCustom
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    : "bg-stone-100 dark:bg-stone-800 text-muted border-line/60"
                }`}
              >
                {typeLabel}
              </span>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-default truncate">{entry.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted">{deletedAgo(entry.deletedAt)}</span>
                  <span className="text-xs text-muted/40">·</span>
                  <span
                    className={`text-xs ${urgent ? "text-red-500 dark:text-red-400 font-medium" : "text-muted"}`}
                  >
                    {purgeLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleRestore(entry.id)}
                  disabled={busy}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold border border-line text-muted hover:text-default hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {restoring ? "Restoring…" : "Restore"}
                </button>
                <DeleteForeverButton
                  onConfirm={() => void handleDeleteForever(entry.id)}
                  disabled={busy}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
