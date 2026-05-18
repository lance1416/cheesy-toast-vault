"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useVault } from "@/lib/vault-context";
import { deriveCryptoKey, decryptEntry, base64ToBuffer } from "@/lib/crypto";
import { SearchIcon, LockIcon } from "@/components/icons";
import type { EntryPayload, EncryptedEntryProp, DecryptedEntry } from "@/types/vault";
import type { Tag } from "../../tag-selector";
import EntryCard from "../../entry-card";
import LockScreen from "../../lock-screen";
import VaultHeader from "../../vault-header";
import NewEntryModal from "../../new-entry-modal";
import EditEntryModal from "../../edit-entry-modal";
import ManageTagsModal from "../../manage-tags-modal";

export default function VaultClient({
  email,
  vault,
  entries,
  tags: initialTags,
}: {
  email: string;
  vault: { id: string; name: string; salt: string };
  entries: EncryptedEntryProp[];
  tags: Tag[];
}) {
  const router = useRouter();
  const { keys, setKey, clearKey } = useVault();
  const cryptoKey = keys[vault.id] ?? null;

  const [decrypted, setDecrypted] = useState<DecryptedEntry[] | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EncryptedEntryProp | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>(initialTags);
  const [query, setQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showManageTags, setShowManageTags] = useState(false);

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
          e.email.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [decrypted, query, selectedTagIds]);

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
      className="min-h-screen bg-amber-50"
      style={{
        fontFamily: "var(--font-dm-sans, sans-serif)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
      }}
    >
      <VaultHeader
        vaultName={vault.name}
        actions={
          <>
            <span className="hidden md:block text-xs text-stone-600 truncate max-w-40 mr-1.5">
              {email}
            </span>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-stone-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              + Add entry
            </button>
            <button
              type="button"
              onClick={() => clearKey(vault.id)}
              aria-label={`Lock vault "${vault.name}"`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <LockIcon />
              Lock
            </button>
            <div className="w-px h-5 bg-stone-200 mx-0.5" role="separator" aria-hidden="true" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Sign out
            </button>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {decrypted.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
                <SearchIcon />
              </span>
              <label htmlFor="vault-search" className="sr-only">
                Search entries
              </label>
              <input
                id="vault-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries…"
                className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:text-amber-700"}`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {selectedTagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTagIds([])}
                    className="rounded-full px-3 py-1 text-xs font-medium text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowManageTags(true)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-stone-600 hover:text-stone-800 transition-colors"
                >
                  Edit tags
                </button>
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
              className="text-xl font-semibold text-stone-700 mb-2"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              This vault is empty
            </h2>
            <p className="text-sm text-stone-600 mb-6">Add your first entry to get started.</p>
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
            <p className="text-stone-600 text-sm mb-3">No entries match your search.</p>
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
          vaultId={vault.id}
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
