import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const vault = await db.vault.findFirst({ where: { id, userId }, select: { id: true } });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.vault.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
