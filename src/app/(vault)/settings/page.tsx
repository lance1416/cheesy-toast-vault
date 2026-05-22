import { getTotpStatus, getLoginHistory } from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const [{ totpEnabled }, loginHistory] = await Promise.all([getTotpStatus(), getLoginHistory()]);
  return <SettingsClient totpEnabled={totpEnabled} loginHistory={loginHistory} />;
}
