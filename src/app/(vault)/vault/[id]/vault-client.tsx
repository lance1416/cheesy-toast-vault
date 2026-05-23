"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/context/vault";
import { deriveCryptoKey, decryptEntry, base64ToBuffer } from "@/lib/crypto";
import { isStalePassword, compareByPasswordAge } from "@/lib/stale-password";
import { SearchIcon, LockIcon, DotsHorizontalIcon } from "@/components/icons";
import type {
  EntryPayload,
  EncryptedEntryProp,
  DecryptedEntry,
  Tag,
  CustomEntryTypeDef,
} from "@/types/vault";
import EntryCard from "../../_components/entry-card";
import LockScreen from "../../_components/lock-screen";
import VaultHeader from "../../_components/vault-header";
import NewEntryModal from "../../_components/new-entry-modal";
import EditEntryModal from "../../_components/edit-entry-modal";
import ManageTagsModal from "../../_components/manage-tags-modal";
import HistoryModal from "../../_components/history-modal";
import TrashView from "../../_components/trash-view";
import UndoToast from "../../_components/undo-toast";
import KeyboardShortcutHelp from "../../_components/keyboard-shortcut-help";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";

const PAGE_NOW = Date.now();

// ─── Vault menu ───────────────────────────────────────────────────────────────

const ITEM_BASE =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left transition-colors";

function VaultMenu({
  vault,
  entryCount,
  onExport,
  onImport,
  onRenamed,
  onDeleted,
}: {
  vault: { id: string; name: string };
  entryCount: number;
  onExport: () => void;
  onImport: (file: File) => void;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "rename" | "delete">("idle");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuError, setMenuError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  function openMenu() {
    setPhase("idle");
    setMenuError("");
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setPhase("idle");
    setMenuError("");
  }

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) closeMenu();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (phase !== "idle") setPhase("idle");
      else closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, phase]);

  useEffect(() => {
    if (phase === "rename") renameInputRef.current?.focus();
  }, [phase]);

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === vault.name) {
      setPhase("idle");
      return;
    }
    setSaving(true);
    setMenuError("");
    try {
      const res = await fetch(`/api/vaults/${vault.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMenuError(data.error ?? "Failed to rename");
      } else {
        onRenamed(trimmed);
        closeMenu();
      }
    } catch {
      setMenuError("Something went wrong");
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
      setMenuError("Failed to delete vault");
      setDeleting(false);
    }
  }

  const divider = <div className="my-1 mx-1 h-px bg-divider" />;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        aria-expanded={open}
        aria-label="More options"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          open ? "bg-line text-default" : "text-muted hover:text-default hover:bg-line"
        }`}
      >
        <DotsHorizontalIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-lg border border-line/60 bg-surface shadow-lg shadow-black/10 z-50 p-1.5">
          {phase === "idle" && (
            <>
              <button
                type="button"
                className={`${ITEM_BASE} text-muted hover:text-default hover:bg-sunken/60`}
                onClick={() => {
                  onExport();
                  closeMenu();
                }}
              >
                Export backup
              </button>
              <label
                className={`${ITEM_BASE} text-muted hover:text-default hover:bg-sunken/60 cursor-pointer`}
              >
                Import backup
                <input
                  type="file"
                  accept=".json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImport(file);
                      closeMenu();
                    }
                    e.target.value = "";
                  }}
                />
              </label>

              {divider}

              <button
                type="button"
                className={`${ITEM_BASE} text-muted hover:text-default hover:bg-sunken/60`}
                onClick={() => {
                  setEditName(vault.name);
                  setPhase("rename");
                }}
              >
                Rename vault
              </button>
              <button
                type="button"
                className={`${ITEM_BASE} text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`}
                onClick={() => setPhase("delete")}
              >
                Delete vault
              </button>
            </>
          )}

          {phase === "rename" && (
            <div className="p-1.5 space-y-2">
              <p className="text-xs font-medium text-muted px-1.5 pt-1">Rename vault</p>
              <input
                ref={renameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleRename();
                  }
                  if (e.key === "Escape") setPhase("idle");
                }}
                disabled={saving}
                className="w-full rounded-lg border border-line bg-sunken/50 px-3 py-2 text-sm text-default outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
              {menuError && (
                <p className="text-xs text-red-500 dark:text-red-400 px-1.5">{menuError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setMenuError("");
                  }}
                  className="flex-1 rounded-lg border border-line py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRename()}
                  disabled={saving || !editName.trim()}
                  className="flex-1 rounded-lg bg-stone-800 dark:bg-amber-600 py-1.5 text-xs font-medium text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {phase === "delete" && (
            <div className="p-1.5 space-y-2.5">
              <div className="px-1.5 pt-1 space-y-1">
                <p className="text-sm font-medium text-default">
                  Delete <span className="font-semibold">{vault.name}</span>?
                </p>
                {entryCount > 0 && (
                  <p className="text-xs text-muted">
                    Removes all {entryCount} {entryCount === 1 ? "entry" : "entries"}.
                  </p>
                )}
              </div>
              {menuError && (
                <p className="text-xs text-red-500 dark:text-red-400 px-1.5">{menuError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setMenuError("");
                  }}
                  className="flex-1 rounded-lg border border-line py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vault client ─────────────────────────────────────────────────────────────

export default function VaultClient({
  vault,
  entries,
  tags: initialTags,
  customTypes = [],
}: {
  vault: { id: string; name: string; salt: string };
  entries: EncryptedEntryProp[];
  tags: Tag[];
  customTypes?: CustomEntryTypeDef[];
}) {
  const router = useRouter();
  const { keys, setKey, clearKey } = useVault();
  const cryptoKey = keys[vault.id] ?? null;

  const [vaultName, setVaultName] = useState(vault.name);
  const [decrypted, setDecrypted] = useState<DecryptedEntry[] | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EncryptedEntryProp | null>(null);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>(initialTags);
  const [query, setQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showManageTags, setShowManageTags] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<
    "updated-desc" | "updated-asc" | "name-asc" | "name-desc" | "age-asc" | "age-desc"
  >("updated-desc");
  const [filterStale, setFilterStale] = useState(false);
  const [importStatus, setImportStatus] = useState<
    "idle" | "importing" | { imported: number } | { error: string }
  >("idle");
  const [activeTab, setActiveTab] = useState<"entries" | "trash">("entries");
  const [trashCount, setTrashCount] = useState<number | null>(null);
  const [undo, setUndo] = useState<{
    ids: string[];
    entries: DecryptedEntry[];
    label: string;
  } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const anyModalOpen = showNew || !!editingEntry || !!historyEntryId || showManageTags || showHelp;

  useKeyboardShortcuts(
    {
      "/": () => searchRef.current?.focus(),
      n: () => {
        if (cryptoKey && !selectionMode) setShowNew(true);
      },
      "?": () => setShowHelp(true),
    },
    anyModalOpen,
  );

  useEffect(() => {
    if (!cryptoKey) return;
    let cancelled = false;
    Promise.all(
      entries.map(async (e) => {
        const payload = await decryptEntry<EntryPayload>(cryptoKey, e.encryptedBlob, e.iv);
        return {
          ...payload,
          id: e.id,
          pinned: e.pinned,
          entryType: e.entryType,
          tags: e.tags,
          updatedAt: e.updatedAt,
        };
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

  const staleCount = useMemo(
    () =>
      (decrypted ?? []).filter(
        (e) => e.entryType === "login" && isStalePassword(e.passwordChangedAt, PAGE_NOW),
      ).length,
    [decrypted],
  );

  const filtered = useMemo(() => {
    if (!decrypted) return [];
    let result = decrypted;
    if (selectedTagIds.length > 0) {
      result = result.filter((e) => e.tags.some((t) => selectedTagIds.includes(t.id)));
    }
    if (filterStale) {
      result = result.filter((e) => isStalePassword(e.passwordChangedAt, PAGE_NOW));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.url?.toLowerCase().includes(q) ||
          e.username?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "updated-asc":
          return a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;
        case "updated-desc":
          return b.updatedAt < a.updatedAt ? -1 : b.updatedAt > a.updatedAt ? 1 : 0;
        case "age-asc":
          return compareByPasswordAge(a, b, "asc");
        case "age-desc":
          return compareByPasswordAge(a, b, "desc");
      }
    });
  }, [decrypted, query, selectedTagIds, sort, filterStale]);

  const handleTogglePin = useCallback(async (entryId: string, pinned: boolean) => {
    await fetch(`/api/vault/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
    setDecrypted((prev) =>
      prev ? prev.map((e) => (e.id === entryId ? { ...e, pinned } : e)) : prev,
    );
  }, []);

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedIds(
      selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.id)),
    );
  }

  async function handleBulkPin(pinned: boolean) {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/vault/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned }),
        }),
      ),
    );
    setDecrypted((prev) =>
      prev ? prev.map((e) => (selectedIds.has(e.id) ? { ...e, pinned } : e)) : prev,
    );
    exitSelectionMode();
  }

  async function handleMoveToTrash(ids: string[], entriesToTrash: DecryptedEntry[]) {
    // Optimistic remove
    setDecrypted((prev) => (prev ? prev.filter((e) => !ids.includes(e.id)) : prev));
    setTrashCount((c) => (c === null ? ids.length : c + ids.length));

    // Fire-and-forget API calls; errors are silently ignored (entries reappear on next refresh)
    void Promise.all(ids.map((id) => fetch(`/api/vault/${id}`, { method: "DELETE" })));

    const label = ids.length === 1 ? "Moved to Trash" : `${ids.length} entries moved to Trash`;
    setUndo({ ids, entries: entriesToTrash, label });
  }

  async function handleUndo() {
    if (!undo) return;
    const { ids, entries: saved } = undo;
    setUndo(null);

    void Promise.all(
      ids.map((id) =>
        fetch(`/api/vault/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true }),
        }),
      ),
    );

    setDecrypted((prev) => {
      if (!prev) return saved;
      const existing = new Set(prev.map((e) => e.id));
      return [...prev, ...saved.filter((e) => !existing.has(e.id))];
    });
    setTrashCount((c) => (c === null ? null : Math.max(0, c - ids.length)));
    router.refresh();
  }

  async function handleBulkMoveToTrash() {
    if (!decrypted) return;
    const ids = [...selectedIds];
    const entriesToTrash = decrypted.filter((e) => ids.includes(e.id));
    exitSelectionMode();
    await handleMoveToTrash(ids, entriesToTrash);
  }

  function toggleTagFilter(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const handleTagCreated = useCallback((tag: Tag) => {
    setAllTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev;
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const handleTagUpdated = useCallback((tag: Tag) => {
    setAllTags((prev) =>
      prev.map((t) => (t.id === tag.id ? tag : t)).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  const handleTagDeleted = useCallback((id: string) => {
    setAllTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagIds((prev) => prev.filter((x) => x !== id));
  }, []);

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    const payload = JSON.stringify(
      { version: 1, vaultName: vault.name, exportedAt: new Date().toISOString(), entries },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vault.name.toLowerCase().replace(/\s+/g, "-")}-${date}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    if (!cryptoKey) return;
    setImportStatus("importing");
    try {
      type BackupEntry = { encryptedBlob: string; iv: string; tags: { name: string }[] };
      type Backup = { version: number; entries: BackupEntry[] };

      const raw: unknown = JSON.parse(await file.text());
      if (
        typeof raw !== "object" ||
        raw === null ||
        (raw as Partial<Backup>).version !== 1 ||
        !Array.isArray((raw as Partial<Backup>).entries)
      )
        throw new Error("Unrecognised backup format.");

      const backup = raw as Backup;

      // Validate the key matches by attempting to decrypt the first entry
      if (backup.entries.length > 0) {
        try {
          await decryptEntry(cryptoKey, backup.entries[0].encryptedBlob, backup.entries[0].iv);
        } catch {
          throw new Error("This backup was encrypted with a different vault password.");
        }
      }

      let imported = 0;
      for (const entry of backup.entries) {
        // Upsert tags by name, collect new IDs
        const tagIds: string[] = [];
        for (const t of entry.tags ?? []) {
          const res = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: t.name }),
          });
          if (res.ok) {
            const tag = (await res.json()) as { id: string };
            tagIds.push(tag.id);
          }
        }

        const vaultRes = await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId: vault.id,
            encryptedBlob: entry.encryptedBlob,
            iv: entry.iv,
            tagIds,
          }),
        });
        if (vaultRes.ok) imported++;
      }

      setImportStatus({ imported });
      router.refresh();
    } catch (err) {
      setImportStatus({ error: err instanceof Error ? err.message : "Import failed." });
    }
  }

  async function handleUnlock(password: string) {
    setUnlockError("");
    setUnlocking(true);
    try {
      const key = await deriveCryptoKey(password, base64ToBuffer(vault.salt));
      if (entries.length > 0) {
        await decryptEntry(key, entries[0].encryptedBlob, entries[0].iv);
      }
      setKey(vault.id, key);
    } catch (err) {
      const isDomError = err instanceof DOMException && err.name === "OperationError";
      setUnlockError(
        isDomError ? "Incorrect vault password." : "Something went wrong. Please try again.",
      );
    } finally {
      setUnlocking(false);
    }
  }

  if (!cryptoKey || decrypted === null) {
    return (
      <LockScreen
        vaultName={vault.name}
        onUnlock={handleUnlock}
        error={unlockError}
        loading={unlocking || (!!cryptoKey && decrypted === null)}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-canvas"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
      }}
    >
      <VaultHeader
        vaultName={vaultName}
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-stone-800 dark:bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              + Add entry
            </button>
            {decrypted && decrypted.length > 0 && (
              <button
                type="button"
                onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${selectionMode ? "border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-line text-muted hover:border-amber-300 dark:hover:border-amber-700 hover:text-default"}`}
              >
                {selectionMode ? "Cancel" : "Select"}
              </button>
            )}
            <button
              type="button"
              onClick={() => clearKey(vault.id)}
              aria-label={`Lock vault "${vaultName}"`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <LockIcon />
              Lock
            </button>
            <VaultMenu
              vault={{ id: vault.id, name: vaultName }}
              entryCount={entries.length}
              onExport={handleExport}
              onImport={handleImport}
              onRenamed={setVaultName}
              onDeleted={() => router.push("/")}
            />
          </>
        }
        mobileActions={
          <>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-stone-800 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
            >
              + Add entry
            </button>
            <div className="h-px bg-line/50 mx-1" />
            <button
              type="button"
              onClick={() => clearKey(vault.id)}
              className="w-full inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted border border-line hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <LockIcon />
              Lock vault
            </button>
            <div className="h-px bg-line/50 my-0.5 mx-1" />
            <button
              type="button"
              onClick={handleExport}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm text-muted hover:text-default hover:bg-sunken transition-colors"
            >
              Export backup
            </button>
            <label className="w-full flex rounded-xl px-3 py-2.5 text-sm text-muted hover:text-default hover:bg-sunken transition-colors cursor-pointer">
              Import backup
              <input
                type="file"
                accept=".json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        }
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 space-y-4">
        {importStatus !== "idle" &&
          (() => {
            const isImporting = importStatus === "importing";
            const isError = typeof importStatus === "object" && "error" in importStatus;
            const tone = isImporting
              ? "border-line/60 bg-surface text-muted"
              : isError
                ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                : "border-green-200 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400";

            let message: string;
            if (isImporting) {
              message = "Importing…";
            } else if (isError) {
              message = importStatus.error;
            } else {
              message = `Imported ${importStatus.imported} entries successfully.`;
            }

            return (
              <div
                role={isError ? "alert" : "status"}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${tone}`}
              >
                <span>{message}</span>
                {!isImporting && (
                  <button
                    type="button"
                    onClick={() => setImportStatus("idle")}
                    className="ml-4 text-xs underline opacity-60 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            );
          })()}

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center border-b border-line/40"
          role="tablist"
          aria-label="Vault views"
        >
          <button
            role="tab"
            aria-selected={activeTab === "entries"}
            aria-controls="tab-panel-entries"
            type="button"
            onClick={() => setActiveTab("entries")}
            className={`relative px-1 pb-2.5 pt-0.5 mr-6 text-sm font-medium transition-colors ${
              activeTab === "entries"
                ? "text-default after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-amber-500 after:rounded-full"
                : "text-muted hover:text-default"
            }`}
          >
            All entries
            {decrypted.length > 0 && (
              <span
                className={`ml-1.5 text-xs tabular-nums ${activeTab === "entries" ? "text-muted" : "text-subtle"}`}
              >
                {decrypted.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "trash"}
            aria-controls="tab-panel-trash"
            type="button"
            onClick={() => setActiveTab("trash")}
            className={`relative px-1 pb-2.5 pt-0.5 text-sm font-medium transition-colors ${
              activeTab === "trash"
                ? "text-default after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-amber-500 after:rounded-full"
                : "text-muted hover:text-default"
            }`}
          >
            Trash
            {trashCount !== null && trashCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-semibold text-default tabular-nums px-1">
                {trashCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Entries tab ─────────────────────────────────────────────────── */}
        <div
          id="tab-panel-entries"
          role="tabpanel"
          hidden={activeTab !== "entries"}
          className="space-y-4"
        >
          {decrypted.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">
                    <SearchIcon />
                  </span>
                  <label htmlFor="vault-search" className="sr-only">
                    Search entries
                  </label>
                  <input
                    id="vault-search"
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search entries…"
                    className="w-full rounded-lg border border-line/60 bg-surface pl-9 pr-4 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  aria-label="Sort entries"
                  className="rounded-lg border border-line/60 bg-surface px-2.5 py-2.5 text-sm text-muted outline-none focus:border-amber-400 transition shrink-0"
                >
                  <option value="updated-desc">Newest</option>
                  <option value="updated-asc">Oldest</option>
                  <option value="name-asc">A → Z</option>
                  <option value="name-desc">Z → A</option>
                  <option value="age-asc">Oldest password</option>
                  <option value="age-desc">Newest password</option>
                </select>
              </div>

              {(allTags.length > 0 || staleCount > 0) && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {allTags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleTagFilter(tag.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700" : "bg-surface text-muted border-line hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 dark:hover:bg-stone-700"}`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}

                  {staleCount > 0 && (
                    <button
                      type="button"
                      aria-pressed={filterStale}
                      onClick={() => setFilterStale((v) => !v)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filterStale ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700" : "bg-surface text-muted border-line hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"}`}
                    >
                      Stale ({staleCount})
                    </button>
                  )}

                  {(selectedTagIds.length > 0 || filterStale) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTagIds([]);
                        setFilterStale(false);
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium text-muted hover:text-default transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  {allTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowManageTags(true)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-muted hover:text-default transition-colors"
                    >
                      Edit tags
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {decrypted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-6xl mb-5 select-none" aria-hidden="true">
                🗝️
              </span>
              <h2
                className="text-xl font-semibold text-default mb-2"
                style={{ fontFamily: "var(--font-playfair, serif)" }}
              >
                This vault is empty
              </h2>
              <p className="text-sm text-muted mb-6">Add your first entry to get started.</p>
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors"
              >
                + Add your first entry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted text-sm mb-3">No entries match your search.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedTagIds([]);
                  setFilterStale(false);
                }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
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
                  onHistory={() => setHistoryEntryId(entry.id)}
                  onTogglePin={(pinned) => handleTogglePin(entry.id, pinned)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(entry.id)}
                  onToggleSelect={() => toggleSelect(entry.id)}
                  customTypes={customTypes}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Trash tab ───────────────────────────────────────────────────── */}
        <div id="tab-panel-trash" role="tabpanel" hidden={activeTab !== "trash"}>
          {activeTab === "trash" && cryptoKey && (
            <TrashView
              vaultId={vault.id}
              cryptoKey={cryptoKey}
              onRestored={() => {
                setTrashCount((c) => (c === null ? null : Math.max(0, c - 1)));
                setActiveTab("entries");
                router.refresh();
              }}
              onCountKnown={setTrashCount}
              customTypes={customTypes}
            />
          )}
        </div>
      </main>

      {selectionMode && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line/60 shadow-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-default">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-muted hover:text-default underline transition-colors"
            >
              {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => void handleBulkPin(true)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Pin
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => void handleBulkPin(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-default hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Unpin
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => void handleBulkMoveToTrash()}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-default hover:bg-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Move to Trash
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <NewEntryModal
          vaultId={vault.id}
          cryptoKey={cryptoKey}
          tags={allTags}
          onTagCreated={handleTagCreated}
          onClose={() => setShowNew(false)}
          onSuccess={() => {
            setShowNew(false);
            router.refresh();
          }}
          customTypes={customTypes}
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
          onMoveToTrash={() => {
            const id = editingEntry.id;
            const decryptedEntry = decrypted?.find((e) => e.id === id);
            setEditingEntry(null);
            if (decryptedEntry) void handleMoveToTrash([id], [decryptedEntry]);
            else void handleMoveToTrash([id], []);
          }}
          customTypes={customTypes}
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

      {historyEntryId && cryptoKey && (
        <HistoryModal
          entryId={historyEntryId}
          cryptoKey={cryptoKey}
          onClose={() => setHistoryEntryId(null)}
          onSuccess={() => {
            setHistoryEntryId(null);
            router.refresh();
          }}
        />
      )}
      {undo && (
        <UndoToast
          key={undo.ids.join(",")}
          label={undo.label}
          onUndo={() => void handleUndo()}
          onExpire={() => setUndo(null)}
        />
      )}
      {showHelp && <KeyboardShortcutHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
