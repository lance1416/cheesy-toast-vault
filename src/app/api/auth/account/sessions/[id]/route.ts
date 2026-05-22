import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await verifySession();

    const authSession = await getServerSession(authOptions);
    if (id === authSession?.user?.sessionId) {
      return NextResponse.json({ error: "Cannot revoke your current session" }, { status: 400 });
    }

    const target = await db.userSession.findFirst({
      where: { id, userId, revokedAt: null },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.userSession.update({ where: { id }, data: { revokedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
