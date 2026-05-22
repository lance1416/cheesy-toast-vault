import { getTotpStatus, getLoginHistory, getUserSessions } from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const [{ totpEnabled }, loginHistory, sessions] = await Promise.all([
    getTotpStatus(),
    getLoginHistory(),
    getUserSessions(),
  ]);
  return (
    <SettingsClient totpEnabled={totpEnabled} loginHistory={loginHistory} sessions={sessions} />
  );
}
