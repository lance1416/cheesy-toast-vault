import type { PrismaClient } from "@/generated/prisma/client";

const TAG_NAMES = ["dev", "entertainment", "finance", "personal", "shopping", "social", "work"];

/** Creates tags for the user and returns a name → id map. */
export async function seedTags(db: PrismaClient, userId: string): Promise<Record<string, string>> {
  const tags: Record<string, string> = {};

  for (const name of TAG_NAMES) {
    const tag = await db.tag.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
    tags[name] = tag.id;
  }

  return tags;
}
