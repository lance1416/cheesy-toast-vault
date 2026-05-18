import { getUser, getVault, getVaultEntries, getTags } from "@/lib/dal";
import VaultClient from "./vault-client";

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, vault, entries, tags] = await Promise.all([
    getUser(),
    getVault(id),
    getVaultEntries(id),
    getTags(),
  ]);

  return (
    <VaultClient
      email={user.email}
      vault={{ id: vault.id, name: vault.name, salt: vault.salt }}
      entries={entries.map((e) => ({
        id: e.id,
        encryptedBlob: e.encryptedBlob,
        iv: e.iv,
        tags: e.tags,
        updatedAt: e.updatedAt.toISOString(),
      }))}
      tags={tags}
    />
  );
}
