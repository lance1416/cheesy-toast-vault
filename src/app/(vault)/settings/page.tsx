import {
  getTotpStatus,
  getLoginHistory,
  getUserSessions,
  getCustomEntryTypes,
  getVaultAccessLog,
} from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const [{ totpEnabled }, loginHistory, sessions, customTypes, vaultAccessLog] = await Promise.all([
    getTotpStatus(),
    getLoginHistory(),
    getUserSessions(),
    getCustomEntryTypes(),
    getVaultAccessLog(),
  ]);
  return (
    <SettingsClient
      totpEnabled={totpEnabled}
      loginHistory={loginHistory}
      sessions={sessions}
      customTypes={customTypes}
      vaultAccessLog={vaultAccessLog}
    />
  );
}
