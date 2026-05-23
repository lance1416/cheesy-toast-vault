import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";

export const verifySession = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user) redirect("/api/auth/clear-session");
  if (!user.emailVerified) redirect("/login?unverified=1");

  if (session.user.sessionId) {
    const userSession = await db.userSession.findUnique({
      where: { id: session.user.sessionId },
      select: { revokedAt: true },
    });
    if (!userSession || userSession.revokedAt !== null) redirect("/api/auth/clear-session");
  }

  return { userId: session.user.id, email: session.user.email };
});

export const getUser = cache(async () => {
  const { userId } = await verifySession();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  // Session references a deleted user (e.g. after a DB reset) — send back to login
  if (!user) redirect("/login");
  return user;
});

export const getVaults = cache(async () => {
  const { userId } = await verifySession();
  return db.vault.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { entries: true } },
    },
  });
});

export const getVault = cache(async (id: string) => {
  const { userId } = await verifySession();
  const vault = await db.vault.findFirst({
    where: { id, userId },
    select: { id: true, name: true, salt: true },
  });
  if (!vault) notFound();
  return vault;
});

export const getTags = cache(async () => {
  const { userId } = await verifySession();
  return db.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
});

export const getTotpStatus = cache(async () => {
  const { userId } = await verifySession();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  if (!user) redirect("/login");
  return { totpEnabled: user.totpEnabled };
});

export const getUserSessions = cache(async () => {
  const { userId } = await verifySession();
  return db.userSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, ip: true, userAgent: true, createdAt: true },
  });
});

export const getLoginHistory = cache(async () => {
  const { userId } = await verifySession();
  return db.loginAudit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, ip: true, success: true, method: true, createdAt: true },
  });
});

export const getVaultEntries = cache(async (vaultId: string) => {
  const { userId } = await verifySession();
  // Verify vault ownership
  const vault = await db.vault.findFirst({ where: { id: vaultId, userId }, select: { id: true } });
  if (!vault) notFound();
  return db.vaultEntry.findMany({
    where: { vaultId },
    select: {
      id: true,
      encryptedBlob: true,
      iv: true,
      pinned: true,
      entryType: true,
      updatedAt: true,
      tags: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
});
