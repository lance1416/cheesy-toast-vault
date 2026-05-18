import { getUser } from "@/lib/dal";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  await getUser();
  return <SettingsClient />;
}
