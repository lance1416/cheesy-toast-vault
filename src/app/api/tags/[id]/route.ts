import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const renameSchema = z.object({ name: z.string().min(1).max(32) });

async function resolveTag(id: string, userId: string) {
  return db.tag.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const tag = await resolveTag(id, userId);
    if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = renameSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const updated = await db.tag.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const tag = await resolveTag(id, userId);
    if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.tag.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
