import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { verifyTotpToken, generateBackupCodes, hashBackupCode } from "@/server/totp";
import { handleApiError } from "@/server/api-error";

const schema = z.object({
  secret: z.string().min(1),
  code: z.string().length(6),
});

/** POST — verify the setup code, persist the secret, and return one-time backup codes. */
export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const { secret, code } = parsed.data;

    if (!(await verifyTotpToken(code, secret))) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } });
    if (user?.totpEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 409 },
      );
    }

    const plainCodes = generateBackupCodes(10);
    const hashedCodes = plainCodes.map(hashBackupCode);

    await db.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: true, totpBackupCodes: hashedCodes },
    });

    return NextResponse.json({ backupCodes: plainCodes });
  } catch (err) {
    return handleApiError(err);
  }
}
