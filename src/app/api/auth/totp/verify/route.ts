import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { verifyTotpToken, generateBackupCodes, hashBackupCode } from "@/server/totp";
import { handleApiError } from "@/server/api-error";

const schema = z.object({
  code: z.string().length(6),
});

/** POST — confirm the setup code and activate TOTP.
 *  The secret is read from the DB (stored by the setup endpoint) — the client
 *  does not need to echo it back. */
export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpSecret: true },
    });

    if (user?.totpEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 409 },
      );
    }
    if (!user?.totpSecret) {
      return NextResponse.json(
        { error: "No pending setup found. Please restart the setup flow." },
        { status: 400 },
      );
    }

    if (!(await verifyTotpToken(parsed.data.code, user.totpSecret))) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
    }

    const plainCodes = generateBackupCodes(10);
    const hashedCodes = plainCodes.map(hashBackupCode);

    await db.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpBackupCodes: hashedCodes },
    });

    return NextResponse.json({ backupCodes: plainCodes });
  } catch (err) {
    return handleApiError(err);
  }
}
