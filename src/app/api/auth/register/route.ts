import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";
import { enforceRateLimit, registrationLimiter } from "@/server/rate-limit";
import { sendVerificationEmail } from "@/server/email";

const schema = z.object({
  email: z.email(),
  loginPassword: z.string().min(12),
  vaultSalt: z.string().min(1),
  vaultName: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(registrationLimiter, req);
  if (limited) return limited;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, loginPassword, vaultSalt, vaultName } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(loginPassword, 12);
    const verificationToken = randomBytes(32).toString("hex");

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        verificationToken,
        vaults: {
          create: {
            name: vaultName ?? "Personal",
            salt: vaultSalt,
          },
        },
      },
      select: { id: true, vaults: { select: { id: true } } },
    });

    const baseUrl =
      process.env.RESET_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    // Send async — don't block registration response
    void sendVerificationEmail(email, verifyUrl).catch(() => null);

    return NextResponse.json({ ok: true, vaultId: user.vaults[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
