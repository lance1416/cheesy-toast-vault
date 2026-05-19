import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verifyError=1", req.url));
  }

  const user = await db.user.findUnique({
    where: { verificationToken: token },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?verifyError=1", req.url));
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
