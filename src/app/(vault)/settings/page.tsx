import { getTotpStatus, getLoginHistory, getUserSessions, getCustomEntryTypes } from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const [{ totpEnabled }, loginHistory, sessions, customTypes] = await Promise.all([
    getTotpStatus(),
    getLoginHistory(),
    getUserSessions(),
    getCustomEntryTypes(),
  ]);
  return (
    <SettingsClient
      totpEnabled={totpEnabled}
      loginHistory={loginHistory}
      sessions={sessions}
      customTypes={customTypes}
    />
  );
}
