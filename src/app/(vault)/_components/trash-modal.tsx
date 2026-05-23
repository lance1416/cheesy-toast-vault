"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/modal";
import { TrashIcon } from "@/components/icons";
import { decryptEntry } from "@/lib/crypto";
import type { EntryPayload } from "@/types/vault";

type TrashedEntry = {
  id: string;
  encryptedBlob: string;
  iv: string;
  entryType: string;
  deletedAt: string;
  tags: { id: string; name: string }[];
};

type DecryptedTrashedEntry = TrashedEntry & { name: string };

const dtf = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export default function TrashModal({
  vaultId,
  cryptoKey,
  onClose,
  onRestored,
}: {
  vaultId: string;
  cryptoKey: CryptoKey;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [entries, setEntries] = useState<DecryptedTrashedEntry[] | null>(null);
  const [error, setError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  const [emptyingTrash, setEmptyingTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/vaults/${vaultId}/trash`);
        if (!res.ok) throw new Error();
        const { entries: raw } = (await res.json()) as { entries: TrashedEntry[] };

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

        if (!cancelled) setEntries(decrypted);
      } catch {
        if (!cancelled) setError("Failed to load trash.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [vaultId, cryptoKey]);

  async function handleRestore(id: string) {
    setPendingRestore((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/vault/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? prev);
      onRestored();
    } finally {
      setPendingRestore((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDeleteForever(id: string) {
    setPendingDelete((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/vault/${id}?permanent=1`, { method: "DELETE" });
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? prev);
    } finally {
      setPendingDelete((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
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
      setConfirmEmpty(false);
    } finally {
      setEmptyingTrash(false);
    }
  }

  const isEmpty = entries !== null && entries.length === 0;

  return (
    <Modal onClose={onClose} title="Trash" titleId="trash-modal-title">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

        {entries === null && !error && (
          <p className="text-sm text-muted text-center py-6 animate-pulse">Loading…</p>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-4xl mb-3 select-none" aria-hidden="true">
              🗑️
            </span>
            <p className="text-sm text-muted">Trash is empty.</p>
          </div>
        )}

        {entries !== null && entries.length > 0 && (
          <>
            <p className="text-xs text-muted">
              {entries.length} deleted {entries.length === 1 ? "entry" : "entries"}
            </p>

            <ul className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {entries.map((entry) => {
                const restoring = pendingRestore.has(entry.id);
                const deleting = pendingDelete.has(entry.id);

                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-line/60 bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-default truncate">{entry.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        Deleted {dtf.format(new Date(entry.deletedAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleRestore(entry.id)}
                        disabled={restoring || deleting}
                        className="rounded-md px-2.5 py-1 text-xs font-medium border border-line text-muted hover:text-default hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {restoring ? "Restoring…" : "Restore"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteForever(entry.id)}
                        disabled={restoring || deleting}
                        aria-label="Delete forever"
                        title="Delete forever"
                        className="text-subtle hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {!confirmEmpty ? (
              <button
                type="button"
                onClick={() => setConfirmEmpty(true)}
                className="w-full rounded-lg border border-red-300 dark:border-red-800 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Empty trash
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-default">
                  Permanently delete all {entries.length}{" "}
                  {entries.length === 1 ? "entry" : "entries"}?
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmEmpty(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleEmptyTrash()}
                  disabled={emptyingTrash}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {emptyingTrash ? "Deleting…" : "Delete all"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
