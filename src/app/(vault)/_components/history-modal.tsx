"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/modal";
import { decryptEntry, encryptEntry } from "@/lib/crypto";
import { EyeIcon, ChevronIcon } from "@/components/icons";
import type { EntryPayload, EntryHistoryItem } from "@/types/vault";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function relativeTime(date: Date): string {
  const diffSec = (date.getTime() - Date.now()) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return "just now";
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Single snapshot row ──────────────────────────────────────────────────────

function SnapshotRow({
  snapshot,
  cryptoKey,
  entryId,
  onRestored,
}: {
  snapshot: EntryHistoryItem;
  cryptoKey: CryptoKey;
  entryId: string;
  onRestored: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<EntryPayload | null>(null);
  const [decryptError, setDecryptError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  const date = useMemo(() => new Date(snapshot.savedAt), [snapshot.savedAt]);

  async function handleToggle() {
    if (!open && !payload && !decryptError) {
      try {
        const p = await decryptEntry<EntryPayload>(cryptoKey, snapshot.encryptedBlob, snapshot.iv);
        setPayload(p);
      } catch {
        setDecryptError(true);
      }
    }
    setOpen((v) => !v);
  }

  async function handleRestore() {
    if (!payload) return;
    setRestoreError("");
    setRestoring(true);
    try {
      const { encryptedBlob, iv } = await encryptEntry(cryptoKey, payload);
      const res = await fetch(`/api/vault/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedBlob, iv }),
      });
      if (!res.ok) throw new Error("Restore failed.");
      onRestored();
    } catch {
      setRestoreError("Restore failed. Please try again.");
      setRestoring(false);
    }
  }

  return (
    <div className="rounded-lg border border-line/60 overflow-hidden">
      {/* Row header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sunken/40 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-default truncate">
            {formatDate(snapshot.savedAt)}
          </p>
          <p className="text-xs text-subtle">{relativeTime(date)}</p>
        </div>
        <ChevronIcon open={open} />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-divider space-y-2.5">
          {decryptError && (
            <p className="text-xs text-red-500 dark:text-red-400">
              Could not decrypt this snapshot.
            </p>
          )}

          {payload && (
            <>
              {(
                [
                  ["Name", payload.name],
                  ["URL", payload.url],
                  ["Username", payload.username],
                  ["Email", payload.email],
                  ["Notes", payload.notes],
                ] as [string, string | undefined][]
              )
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-muted pt-0.5">
                      {label}
                    </span>
                    <span className="flex-1 text-sm text-default break-all">{value}</span>
                  </div>
                ))}

              {/* Password row with show/hide */}
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium text-muted">Password</span>
                <span className="flex-1 truncate text-sm text-default font-mono">
                  {showPassword ? payload.password : "••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 text-subtle hover:text-default transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {restoreError && (
                <p role="alert" className="text-xs text-red-500 dark:text-red-400">
                  {restoreError}
                </p>
              )}

              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="mt-1 rounded-lg bg-stone-800 dark:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoring ? "Restoring…" : "Restore this version"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History modal ────────────────────────────────────────────────────────────

export default function HistoryModal({
  entryId,
  cryptoKey,
  onClose,
  onSuccess,
}: {
  entryId: string;
  cryptoKey: CryptoKey;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [snapshots, setSnapshots] = useState<EntryHistoryItem[]>([]);

  useEffect(() => {
    fetch(`/api/vault/${entryId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { history: EntryHistoryItem[] }) => {
        setSnapshots(data.history);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load history.");
        setLoading(false);
      });
  }, [entryId]);

  return (
    <Modal
      title="Entry History"
      titleId="history-modal-title"
      onClose={onClose}
      scrollable
      maxWidth="max-w-lg"
    >
      {loading && <p className="py-8 text-center text-sm text-muted">Loading…</p>}

      {fetchError && (
        <p role="alert" className="py-8 text-center text-sm text-red-500 dark:text-red-400">
          {fetchError}
        </p>
      )}

      {!loading && !fetchError && snapshots.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm text-muted">No history yet.</p>
          <p className="text-xs text-subtle mt-1">
            History is recorded each time an entry is saved.
          </p>
        </div>
      )}

      {!loading && snapshots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-subtle mb-3">
            {snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"} — most recent
            first
          </p>
          {snapshots.map((s) => (
            <SnapshotRow
              key={s.id}
              snapshot={s}
              cryptoKey={cryptoKey}
              entryId={entryId}
              onRestored={() => {
                onSuccess();
              }}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
