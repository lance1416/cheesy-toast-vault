import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

const createSchema = z.object({
  vaultId: z.string().min(1),
  encryptedBlob: z.string().min(1),
  iv: z.string().min(1),
  entryType: z.enum(["login", "note", "card", "identity"]).default("login"),
  tagIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { vaultId, encryptedBlob, iv, entryType, tagIds } = parsed.data;

    // Verify vault belongs to current user
    const vault = await db.vault.findFirst({
      where: { id: vaultId, userId },
      select: { id: true },
    });
    if (!vault) return NextResponse.json({ error: "Vault not found" }, { status: 404 });

    const entry = await db.vaultEntry.create({
      data: {
        vaultId,
        encryptedBlob,
        iv,
        entryType,
        tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
