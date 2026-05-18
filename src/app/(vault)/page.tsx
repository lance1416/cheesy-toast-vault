import { getUser, getVaults } from "@/lib/dal";
import VaultOverviewClient from "./vault-overview-client";

export default async function VaultOverviewPage() {
  const [, vaults] = await Promise.all([getUser(), getVaults()]);
  return <VaultOverviewClient vaults={vaults} />;
}
