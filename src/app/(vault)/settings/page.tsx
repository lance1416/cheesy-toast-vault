import { getUser } from "@/server/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  await getUser();
  return <SettingsClient />;
}
