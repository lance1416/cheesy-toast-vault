import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const updateSchema = z.object({
  encryptedBlob: z.string().min(1),
  iv: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
});

async function resolveEntry(id: string, userId: string) {
  return db.vaultEntry.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const entry = await resolveEntry(id, userId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await db.vaultEntry.update({
      where: { id },
      data: {
        encryptedBlob: parsed.data.encryptedBlob,
        iv: parsed.data.iv,
        ...(parsed.data.tagIds !== undefined && {
          tags: { set: parsed.data.tagIds.map((tid) => ({ id: tid })) },
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const entry = await resolveEntry(id, userId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.vaultEntry.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
