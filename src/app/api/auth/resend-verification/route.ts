import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { registrationLimiter, getIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.email() });

export async function POST(req: Request) {
  try {
    const ip = getIp(req);
    await registrationLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

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
