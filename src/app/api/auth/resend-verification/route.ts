import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { sendVerificationEmail } from "@/server/email";
import { enforceRateLimit, registrationLimiter } from "@/server/rate-limit";

const schema = z.object({ email: z.email() });

export async function POST(req: Request) {
  const limited = await enforceRateLimit(registrationLimiter, req);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: true }); // always 200

  const { email } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });
    if (user && !user.emailVerified) {
      const verificationToken = randomBytes(32).toString("hex");
      await db.user.update({ where: { id: user.id }, data: { verificationToken } });
      const baseUrl =
        process.env.RESET_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendVerificationEmail(email, `${baseUrl}/verify-email?token=${verificationToken}`);
    }
  } catch {
    // swallow — never leak whether the email exists
  }

  return NextResponse.json({ ok: true });
}
