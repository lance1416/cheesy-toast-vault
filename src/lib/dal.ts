import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const verifySession = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, email: session.user.email };
});

export const getUser = cache(async () => {
  const { userId } = await verifySession();
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, salt: true },
  });
});

export const getTags = cache(async () => {
  const { userId } = await verifySession();
  return db.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
});

export const getVaultEntries = cache(async () => {
  const { userId } = await verifySession();
  return db.vaultEntry.findMany({
    where: { userId },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
});
