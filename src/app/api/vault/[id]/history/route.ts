import { NextResponse } from "next/server";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const entry = await db.vaultEntry.findFirst({
      where: { id, vault: { userId } },
      select: { id: true },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const history = await db.entryHistory.findMany({
      where: { entryId: id },
      orderBy: { savedAt: "desc" },
      take: 10,
      select: { id: true, encryptedBlob: true, iv: true, savedAt: true },
    });

    return NextResponse.json({ history });
  } catch (err) {
    return handleApiError(err);
  }
}
