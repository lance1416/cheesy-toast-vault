import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const createSchema = z.object({
  encryptedBlob: z.string().min(1),
  iv: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { encryptedBlob, iv, tagIds } = parsed.data;

    const entry = await db.vaultEntry.create({
      data: {
        userId,
        encryptedBlob,
        iv,
        tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
