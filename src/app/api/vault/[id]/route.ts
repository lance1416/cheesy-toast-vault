import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

const HISTORY_LIMIT = 10;

const updateSchema = z.object({
  encryptedBlob: z.string().min(1),
  iv: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
});

const patchSchema = z.union([
  z.object({ pinned: z.boolean() }),
  z.object({ restore: z.literal(true) }),
]);

async function resolveEntry(id: string, userId: string) {
  return db.vaultEntry.findFirst({
    where: { id, vault: { userId }, deletedAt: null },
    select: { id: true, encryptedBlob: true, iv: true },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const entry = await resolveEntry(id, userId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { encryptedBlob, iv, tagIds } = parsed.data;

    // Snapshot the current blob then apply the update atomically
    await db.$transaction([
      db.entryHistory.create({
        data: { entryId: id, encryptedBlob: entry.encryptedBlob, iv: entry.iv },
      }),
      db.vaultEntry.update({
        where: { id },
        data: {
          encryptedBlob,
          iv,
          ...(tagIds !== undefined && {
            tags: { set: tagIds.map((tid) => ({ id: tid })) },
          }),
        },
      }),
    ]);

    // Prune oldest snapshots beyond the limit (best-effort, outside transaction)
    const overflow = await db.entryHistory.findMany({
      where: { entryId: id },
      orderBy: { savedAt: "desc" },
      skip: HISTORY_LIMIT,
      select: { id: true },
    });
    if (overflow.length > 0) {
      await db.entryHistory.deleteMany({ where: { id: { in: overflow.map((s) => s.id) } } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    if ("restore" in parsed.data) {
      const entry = await db.vaultEntry.findFirst({
        where: { id, vault: { userId }, deletedAt: { not: null } },
        select: { id: true },
      });
      if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.vaultEntry.update({ where: { id }, data: { deletedAt: null } });
    } else {
      const entry = await resolveEntry(id, userId);
      if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.vaultEntry.update({ where: { id }, data: { pinned: parsed.data.pinned } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";

    if (permanent) {
      const entry = await db.vaultEntry.findFirst({
        where: { id, vault: { userId } },
        select: { id: true },
      });
      if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.vaultEntry.delete({ where: { id } });
    } else {
      const entry = await resolveEntry(id, userId);
      if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.vaultEntry.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
