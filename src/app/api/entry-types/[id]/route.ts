import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";
import type { CustomFieldDef } from "@/types/vault";

const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["text", "secret", "url", "email", "date", "multiline"]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  fields: z.array(fieldSchema).min(1).max(20).optional(),
});

async function resolveType(id: string, userId: string) {
  return db.customEntryType.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();
    if (!(await resolveType(id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { name, fields } = parsed.data;
    const updated = await db.customEntryType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(fields !== undefined && { fields: fields as object[] }),
      },
      select: { id: true, name: true, fields: true },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      fields: updated.fields as CustomFieldDef[],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();
    if (!(await resolveType(id, userId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.customEntryType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
