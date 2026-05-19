import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { sendPasswordResetEmail } from "@/server/email";
import { enforceRateLimit, registrationLimiter } from "@/server/rate-limit";

const schema = z.object({ email: z.email() });

export async function POST(req: Request) {
  const limited = await enforceRateLimit(registrationLimiter, req);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: true }); // always 200 to prevent enumeration
  }

  const { email } = parsed.data;

  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
      });

      const baseUrl =
        process.env.RESET_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
  } catch {
    // swallow — never leak whether the email exists
  }

  return NextResponse.json({ ok: true });
}
