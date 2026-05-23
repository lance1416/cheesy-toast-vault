import { getUser, getVaults } from "@/server/dal";
import AppSidebar from "./_components/app-sidebar";

export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const [user, vaults] = await Promise.all([getUser(), getVaults()]);

  return (
    <div
      className="flex h-screen bg-canvas overflow-hidden"
      style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}
    >
      <AppSidebar user={user} initialVaults={vaults} />
      <div className="flex-1 overflow-y-auto min-w-0">{children}</div>
    </div>
  );
}
