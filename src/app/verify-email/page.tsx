import { redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) redirect("/login?verifyError=1");

  const user = await db.user.findUnique({
    where: { verificationToken: token },
    select: { id: true },
  });

  if (!user) redirect("/login?verifyError=1");

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  redirect("/login?verified=1");
}
