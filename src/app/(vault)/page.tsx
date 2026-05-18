import { getUser, getVaults } from "@/lib/dal";
import VaultOverviewClient from "./vault-overview-client";

export default async function VaultOverviewPage() {
  const [user, vaults] = await Promise.all([getUser(), getVaults()]);
  return <VaultOverviewClient email={user.email} vaults={vaults} />;
}
