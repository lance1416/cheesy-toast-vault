import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

const schema = z.object({
  email: z.email(),
  loginPassword: z.string().min(12),
  vaultSalt: z.string().min(1),
  vaultName: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request) {
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

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        vaults: {
          create: {
            name: vaultName ?? "Personal",
            salt: vaultSalt,
          },
        },
      },
      select: { id: true, vaults: { select: { id: true } } },
    });

    return NextResponse.json({ ok: true, vaultId: user.vaults[0].id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
