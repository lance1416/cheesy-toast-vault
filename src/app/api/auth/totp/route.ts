import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import {
  generateSecret,
  generateTotpUri,
  verifyTotpToken,
  hashBackupCode,
  normalizeBackupCode,
} from "@/server/totp";
import { handleApiError } from "@/server/api-error";
import { enforceRateLimit, authLimiter } from "@/server/rate-limit";

/** POST — generate a fresh TOTP secret for the enrollment flow.
 *  The secret is NOT persisted here; the client sends it back in /verify. */
export async function POST() {
  try {
    const { userId, email } = await verifySession();

    const user = await db.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } });
    if (user?.totpEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 409 },
      );
    }

    const secret = generateSecret();
    const otpAuthUrl = generateTotpUri(email ?? "user", secret);

    return NextResponse.json({ secret, otpAuthUrl });
  } catch (err) {
    return handleApiError(err);
  }
}

const disableSchema = z.object({ code: z.string().min(1) });

/** DELETE — disable TOTP for the current user; requires a valid TOTP code. */
export async function DELETE(req: Request) {
  try {
    const limited = await enforceRateLimit(authLimiter, req);
    if (limited) return limited;

    const { userId } = await verifySession();

    const parsed = disableSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpSecret: true, totpBackupCodes: true },
    });

    if (!user?.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled." },
        { status: 400 },
      );
    }

    const code = parsed.data.code.trim();
    const isNumericOtp = /^\d{6}$/.test(code);
    let valid = false;

    if (isNumericOtp) {
      valid = await verifyTotpToken(code, user.totpSecret);
    } else {
      const hash = hashBackupCode(normalizeBackupCode(code));
      valid = user.totpBackupCodes.includes(hash);
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    }

    await db.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false, totpBackupCodes: [] },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
