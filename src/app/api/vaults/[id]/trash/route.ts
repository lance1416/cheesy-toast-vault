import { NextResponse } from "next/server";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vaultId } = await params;
    const { userId } = await verifySession();

    const vault = await db.vault.findFirst({
      where: { id: vaultId, userId },
      select: { id: true },
    });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entries = await db.vaultEntry.findMany({
      where: { vaultId, deletedAt: { not: null } },
      select: {
        id: true,
        encryptedBlob: true,
        iv: true,
        entryType: true,
        deletedAt: true,
        tags: { select: { id: true, name: true } },
      },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}
