import { getUser, getVaultEntries } from "@/lib/dal";
import VaultClient from "./vault-client";

export default async function VaultPage() {
  const [user, entries] = await Promise.all([getUser(), getVaultEntries()]);

  return (
    <VaultClient
      email={user.email}
      salt={user.salt}
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
