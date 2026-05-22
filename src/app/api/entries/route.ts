import { NextResponse } from "next/server";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

export async function GET() {
  try {
    const { userId } = await verifySession();

    const vaults = await db.vault.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        entries: {
          select: {
            id: true,
            encryptedBlob: true,
            iv: true,
            pinned: true,
            updatedAt: true,
            tags: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ vaults });
  } catch (err) {
    return handleApiError(err);
  }
}
