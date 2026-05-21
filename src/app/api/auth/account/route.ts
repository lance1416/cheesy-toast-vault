import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { sendVerificationEmail } from "@/server/email";
import { handleApiError } from "@/server/api-error";

const changePasswordSchema = z.object({
  action: z.literal("changePassword"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

const changeEmailSchema = z.object({
  action: z.literal("changeEmail"),
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
});

const patchSchema = z.discriminatedUnion("action", [changePasswordSchema, changeEmailSchema]);

const deleteSchema = z.object({
  password: z.string().min(1),
});

export async function PATCH(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    if (parsed.data.action === "changePassword") {
      const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
      await db.user.update({ where: { id: userId }, data: { passwordHash } });
      return NextResponse.json({ ok: true });
    }

    // changeEmail
    const { newEmail } = parsed.data;
    const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "Email is already in use" }, { status: 409 });

    const verificationToken = randomBytes(32).toString("hex");
    await db.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerified: false, verificationToken },
    });

    const baseUrl =
      process.env.RESET_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    void sendVerificationEmail(newEmail, verifyUrl).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Password is incorrect" }, { status: 401 });

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
