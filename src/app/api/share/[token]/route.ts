import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: rawToken } = await params;
    const tokenHash = hashToken(rawToken);

    const link = await db.shareLink.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        encryptedBlob: true,
        iv: true,
        entryType: true,
        label: true,
        expiresAt: true,
        viewCount: true,
        maxViews: true,
      },
    });

    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const expired = link.expiresAt < new Date();
    const limitReached = link.maxViews !== null && link.viewCount >= link.maxViews;

    if (expired || limitReached) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Increment view count (fire-and-forget — don't block the response)
    void db.shareLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      encryptedBlob: link.encryptedBlob,
      iv: link.iv,
      entryType: link.entryType,
      label: link.label,
      expiresAt: link.expiresAt.toISOString(),
      viewCount: link.viewCount,
      maxViews: link.maxViews,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: rawToken } = await params;
    const { userId } = await verifySession();
    const tokenHash = hashToken(rawToken);

    const link = await db.shareLink.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    });

    if (!link || link.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.shareLink.delete({ where: { id: link.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
