import { getTotpStatus } from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const { totpEnabled } = await getTotpStatus();
  return <SettingsClient totpEnabled={totpEnabled} />;
}
