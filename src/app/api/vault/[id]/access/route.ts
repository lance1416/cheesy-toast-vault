import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await verifySession();
    const { id: vaultId } = await params;

    const vault = await db.vault.findFirst({
      where: { id: vaultId, userId },
      select: { id: true },
    });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

    await db.vaultAccess.create({ data: { vaultId, userId, ip } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
