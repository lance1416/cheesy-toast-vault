import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  salt: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, salt } = parsed.data;

    const existing = await db.vault.findFirst({ where: { userId, name }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "A vault with that name already exists" }, { status: 409 });
    }

    const vault = await db.vault.create({
      data: { userId, name, salt },
      select: { id: true, name: true },
    });

    return NextResponse.json(vault, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
