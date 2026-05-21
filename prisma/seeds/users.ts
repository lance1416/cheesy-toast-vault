import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

export type SeededUser = { userId: string; email: string };

export const USERS = [
  { email: "dev@example.com", password: "DevPassword123!" },
  { email: "other@example.com", password: "OtherPass123!" },
];

export async function seedUsers(db: PrismaClient): Promise<SeededUser[]> {
  const results: SeededUser[] = [];
  for (const { email, password } of USERS) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, emailVerified: true },
      create: { email, passwordHash, emailVerified: true },
    });
    results.push({ userId: user.id, email });
  }
  return results;
}
