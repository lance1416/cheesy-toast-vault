import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const createSchema = z.object({ name: z.string().min(1).max(32) });

export async function GET() {
  try {
    const { userId } = await verifySession();
    const tags = await db.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const tag = await db.tag.upsert({
      where: { userId_name: { userId, name: parsed.data.name } },
      update: {},
      create: { userId, name: parsed.data.name },
      select: { id: true, name: true },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
