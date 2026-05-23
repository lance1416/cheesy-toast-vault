import { getUser, getVault, getVaultEntries, getTags, getCustomEntryTypes } from "@/server/dal";
import VaultClient from "./vault-client";

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, vault, entries, tags, customTypes] = await Promise.all([
    getUser(),
    getVault(id),
    getVaultEntries(id),
    getTags(),
    getCustomEntryTypes(),
  ]);

  return (
    <VaultClient
      vault={{ id: vault.id, name: vault.name, salt: vault.salt }}
      entries={entries.map((e) => ({
        id: e.id,
        encryptedBlob: e.encryptedBlob,
        iv: e.iv,
        pinned: e.pinned,
        entryType: e.entryType,
        tags: e.tags,
        updatedAt: e.updatedAt.toISOString(),
      }))}
      tags={tags}
      customTypes={customTypes}
    />
  );
}
