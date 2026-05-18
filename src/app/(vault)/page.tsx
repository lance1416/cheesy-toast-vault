import { getUser, getVaultEntries, getTags } from "@/lib/dal";
import VaultClient from "./vault-client";

export default async function VaultPage() {
  const [user, entries, tags] = await Promise.all([getUser(), getVaultEntries(), getTags()]);

  return (
    <VaultClient
      email={user.email}
      salt={user.salt}
      tags={tags}
      entries={entries.map((e) => ({
        id: e.id,
        encryptedBlob: e.encryptedBlob,
        iv: e.iv,
        tags: e.tags,
        updatedAt: e.updatedAt.toISOString(),
      }))}
    />
  );
}
