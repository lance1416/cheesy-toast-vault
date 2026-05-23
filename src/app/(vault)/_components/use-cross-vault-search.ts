"use client";

import { useEffect, useMemo, useState } from "react";
import { useVault } from "@/context/vault";
import { decryptEntry } from "@/lib/crypto";
import type { EntryPayload, EncryptedEntryProp, DecryptedEntry } from "@/types/vault";

type RawVault = { id: string; name: string; entries: EncryptedEntryProp[] };

// Cross-vault result: a decrypted entry augmented with its vault attribution.
// Local to this module — callers use the inferred element type of `searchResults`.
type CrossVaultEntry = DecryptedEntry & { vaultId: string; vaultName: string };

type FetchState = "idle" | "loading" | "ready" | { error: string };

type VaultKeySlot = { key: CryptoKey; mode: "real" | "decoy" };

export type CrossVaultSearchResult = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fetchState: FetchState;
  searchResults: CrossVaultEntry[];
  unlockedCount: number;
  rawVaults: RawVault[];
  keys: Record<string, VaultKeySlot>;
};

export function useCrossVaultSearch(): CrossVaultSearchResult {
  const { keys } = useVault();
  const [searchQuery, setSearchQueryState] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [rawVaults, setRawVaults] = useState<RawVault[]>([]);
  const [allDecrypted, setAllDecrypted] = useState<CrossVaultEntry[]>([]);

  function setSearchQuery(q: string) {
    setSearchQueryState(q);
  }

  // Fetch all encrypted entries as soon as any vault is unlocked (proactive — also feeds health dashboard)
  useEffect(() => {
    if (Object.keys(keys).length === 0 || fetchState !== "idle") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchState("loading");
    fetch("/api/entries")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { vaults: RawVault[] }) => {
        setRawVaults(data.vaults);
        setFetchState("ready");
      })
      .catch(() => setFetchState({ error: "Failed to load entries." }));
  }, [keys, fetchState]);

  // Decrypt all entries for currently-unlocked vaults whenever raw data or keys change
  useEffect(() => {
    const unlockedVaults = rawVaults.filter((v) => keys[v.id]);
    let cancelled = false;
    Promise.all(
      unlockedVaults.flatMap((v) =>
        v.entries.map(async (e) => {
          try {
            const payload = await decryptEntry<EntryPayload>(
              keys[v.id]!.key,
              e.encryptedBlob,
              e.iv,
            );
            return {
              ...payload,
              id: e.id,
              pinned: e.pinned,
              entryType: e.entryType,
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
        e.username?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q),
    );
  }, [allDecrypted, searchQuery]);

  const unlockedCount = rawVaults.filter((v) => keys[v.id]).length;

  return { searchQuery, setSearchQuery, fetchState, searchResults, unlockedCount, rawVaults, keys };
}
