import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

const renameSchema = z.object({ name: z.string().min(1).max(64) });
const decoySchema = z.object({ decoySalt: z.string().min(1).nullable() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const vault = await db.vault.findFirst({ where: { id, userId }, select: { id: true } });
    if (!vault) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: unknown = await req.json();

    // decoySalt update (set or clear)
    if (typeof body === "object" && body !== null && "decoySalt" in body) {
      const parsed = decoySchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

      if (parsed.data.decoySalt === null) {
        // Remove decoy: delete all isDecoy entries, then clear decoySalt in a transaction
        await db.$transaction([
          db.vaultEntry.deleteMany({ where: { vaultId: id, isDecoy: true } }),
          db.vault.update({ where: { id }, data: { decoySalt: null } }),
        ]);
      } else {
        await db.vault.update({ where: { id }, data: { decoySalt: parsed.data.decoySalt } });
      }

      return NextResponse.json({ ok: true });
    }

    // Rename
    const parsed = renameSchema.safeParse(body);
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
