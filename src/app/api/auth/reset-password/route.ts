import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authLimiter, getIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12),
});

export async function POST(req: Request) {
  try {
    const ip = getIp(req);
    await authLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { token, newPassword } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const user = await db.user.findFirst({
    where: { resetTokenHash: tokenHash },
    select: { id: true, resetTokenExpiry: true },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json({ error: "This link has expired or is invalid." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
