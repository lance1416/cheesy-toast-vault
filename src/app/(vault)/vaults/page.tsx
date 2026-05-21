import { getUser, getVaults } from "@/server/dal";
import VaultOverviewClient from "../_components/vault-overview-client";

export default async function VaultsPage() {
  const [, vaults] = await Promise.all([getUser(), getVaults()]);
  return <VaultOverviewClient vaults={vaults} />;
}
