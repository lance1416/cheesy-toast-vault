import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

const createSchema = z.object({
  tokenHash: z.string().length(64),
  encryptedBlob: z.string().min(1),
  iv: z.string().min(1),
  entryType: z.string().min(1).default("login"),
  label: z.string().min(1).max(128),
  expiresAt: z.string().datetime(),
  maxViews: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { tokenHash, encryptedBlob, iv, entryType, label, expiresAt, maxViews } = parsed.data;

    const link = await db.shareLink.create({
      data: {
        tokenHash,
        userId,
        encryptedBlob,
        iv,
        entryType,
        label,
        expiresAt: new Date(expiresAt),
        maxViews: maxViews ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: link.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const { userId } = await verifySession();

    const links = await db.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        entryType: true,
        expiresAt: true,
        viewCount: true,
        maxViews: true,
        createdAt: true,
      },
    });

    return NextResponse.json(links);
  } catch (err) {
    return handleApiError(err);
  }
}
