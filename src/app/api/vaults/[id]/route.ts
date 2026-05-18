import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

const renameSchema = z.object({ name: z.string().min(1).max(64) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const vault = await db.vault.findFirst({ where: { id, userId }, select: { id: true } });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = renameSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const updated = await db.vault.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const vault = await db.vault.findFirst({ where: { id, userId }, select: { id: true } });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.vault.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
