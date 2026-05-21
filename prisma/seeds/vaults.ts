import type { PrismaClient } from "@/generated/prisma/client";
import { deriveKey, encryptEntry, saltB64, daysAgo } from "./_crypto";

export type EntryDef = {
  name: string;
  url: string;
  username: string;
  email: string;
  password: string;
  notes: string;
  passwordChangedAt: string;
  tags: string[];
};

export type VaultDef = {
  name: string;
  password: string;
  entries: EntryDef[];
};

// ─── Vault data per user (keyed by email) ────────────────────────────────────

export const VAULT_DATA: Record<string, VaultDef[]> = {
  "dev@example.com": [
    {
      name: "Personal",
      password: "PersonalVault1!",
      entries: [
        {
          name: "GitHub",
          url: "https://github.com",
          username: "dev",
          email: "dev@example.com",
          password: "GHsecret!2024",
          notes: "Personal developer account",
          passwordChangedAt: daysAgo(5),
          tags: ["dev", "personal"],
        },
        {
          name: "Gmail",
          url: "https://mail.google.com",
          username: "",
          email: "dev@gmail.com",
          password: "Gm@ilPass2024!",
          notes: "",
          passwordChangedAt: daysAgo(30),
          tags: ["personal", "social"],
        },
        {
          name: "Netflix",
          url: "https://netflix.com",
          username: "",
          email: "dev@gmail.com",
          password: "N3tfl1x#Watch",
          notes: "Standard plan",
          passwordChangedAt: daysAgo(60),
          tags: ["entertainment", "personal"],
        },
        {
          name: "Amazon",
          url: "https://amazon.com",
          username: "dev_shopper",
          email: "dev@example.com",
          password: "Amaz0n#Prime25",
          notes: "Prime subscription — annual renewal in March",
          passwordChangedAt: daysAgo(100), // stale
          tags: ["shopping", "personal"],
        },
      ],
    },
    {
      name: "Work",
      password: "WorkVault456!",
      entries: [
        {
          name: "Slack",
          url: "https://app.slack.com",
          username: "dev",
          email: "dev@work.com",
          password: "Sl@ckW0rk!",
          notes: "",
          passwordChangedAt: daysAgo(5),
          tags: ["work"],
        },
        {
          name: "Linear",
          url: "https://linear.app",
          username: "dev",
          email: "dev@work.com",
          password: "L1n3ar!Issues",
          notes: "Project management",
          passwordChangedAt: daysAgo(15),
          tags: ["work", "dev"],
        },
        {
          name: "Notion",
          url: "https://notion.so",
          username: "",
          email: "dev@work.com",
          password: "N0t10n#Docs24",
          notes: "Team wiki",
          passwordChangedAt: daysAgo(45),
          tags: ["work"],
        },
        {
          name: "AWS Console",
          url: "https://console.aws.amazon.com",
          username: "dev-admin",
          email: "dev@work.com",
          password: "Aws!Cl0ud2023",
          notes: "Root account — MFA enabled",
          passwordChangedAt: daysAgo(200), // stale
          tags: ["work", "dev"],
        },
      ],
    },
    {
      name: "Finance",
      password: "FinanceVault789!",
      entries: [
        {
          name: "Chase",
          url: "https://chase.com",
          username: "dev_user",
          email: "dev@example.com",
          password: "Ch@seBank24!",
          notes: "Checking + savings",
          passwordChangedAt: daysAgo(20),
          tags: ["finance", "personal"],
        },
        {
          name: "Robinhood",
          url: "https://robinhood.com",
          username: "dev_trader",
          email: "dev@example.com",
          password: "R0b1nH00d!Inv",
          notes: "",
          passwordChangedAt: daysAgo(5),
          tags: ["finance"],
        },
        {
          name: "Coinbase",
          url: "https://coinbase.com",
          username: "dev_crypto",
          email: "dev@example.com",
          password: "C01nb@se$2024",
          notes: "2FA enabled via authenticator app",
          passwordChangedAt: daysAgo(10),
          tags: ["finance"],
        },
        {
          name: "PayPal",
          url: "https://paypal.com",
          username: "dev_shopper",
          email: "dev@example.com",
          password: "P@yP@l2023!old",
          notes: "",
          passwordChangedAt: daysAgo(180), // stale
          tags: ["finance", "shopping"],
        },
      ],
    },
  ],

  "other@example.com": [
    {
      name: "Home",
      password: "HomeVault111!",
      entries: [
        {
          name: "Netflix",
          url: "https://netflix.com",
          username: "",
          email: "other@gmail.com",
          password: "0therNetflix!",
          notes: "Family plan",
          passwordChangedAt: daysAgo(10),
          tags: ["entertainment", "personal"],
        },
        {
          name: "Spotify",
          url: "https://spotify.com",
          username: "other_listener",
          email: "other@gmail.com",
          password: "Sp0t1fy#Music",
          notes: "Premium individual",
          passwordChangedAt: daysAgo(25),
          tags: ["entertainment"],
        },
        {
          name: "ISP Account",
          url: "https://xfinity.com",
          username: "other_home",
          email: "other@example.com",
          password: "XF1n1ty!Home",
          notes: "Gigabit plan — autopay enabled",
          passwordChangedAt: daysAgo(150), // stale
          tags: ["personal"],
        },
      ],
    },
    {
      name: "Hobbies",
      password: "HobbiesVault222!",
      entries: [
        {
          name: "Steam",
          url: "https://store.steampowered.com",
          username: "other_gamer",
          email: "other@gmail.com",
          password: "St3@mG@mes!",
          notes: "",
          passwordChangedAt: daysAgo(8),
          tags: ["entertainment"],
        },
        {
          name: "Discord",
          url: "https://discord.com",
          username: "other#1234",
          email: "other@gmail.com",
          password: "D1sc0rd!Chat",
          notes: "Nitro subscriber",
          passwordChangedAt: daysAgo(40),
          tags: ["entertainment", "social"],
        },
        {
          name: "Strava",
          url: "https://strava.com",
          username: "other_runner",
          email: "other@example.com",
          password: "Str@va#Run24",
          notes: "",
          passwordChangedAt: daysAgo(120), // stale
          tags: ["personal"],
        },
      ],
    },
  ],
};

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedVaults(
  db: PrismaClient,
  userId: string,
  tags: Record<string, string>,
  vaults: VaultDef[],
): Promise<void> {
  for (const vaultDef of vaults) {
    const { bytes, b64 } = saltB64();
    const key = await deriveKey(vaultDef.password, bytes);

    const vault = await db.vault.upsert({
      where: { userId_name: { userId, name: vaultDef.name } },
      update: { salt: b64 },
      create: { userId, name: vaultDef.name, salt: b64 },
    });

    await db.vaultEntry.deleteMany({ where: { vaultId: vault.id } });

    for (const entry of vaultDef.entries) {
      const { tags: entryTagNames, ...payload } = entry;
      const { encryptedBlob, iv } = await encryptEntry(key, payload);
      await db.vaultEntry.create({
        data: {
          vaultId: vault.id,
          encryptedBlob,
          iv,
          tags: {
            connect: entryTagNames.filter((name) => tags[name]).map((name) => ({ id: tags[name] })),
          },
        },
      });
    }
  }
}
