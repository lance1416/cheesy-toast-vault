import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/server/dal";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";
import type { CustomFieldDef } from "@/types/vault";

const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["text", "secret", "url", "email", "date", "multiline"]),
});

const createSchema = z.object({
  name: z.string().min(1).max(50),
  fields: z.array(fieldSchema).min(1).max(20),
});

export async function GET() {
  try {
    const { userId } = await verifySession();
    const rows = await db.customEntryType.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, fields: true },
    });
    const types = rows.map((r) => ({
      id: r.id,
      name: r.name,
      fields: r.fields as CustomFieldDef[],
    }));
    return NextResponse.json({ types });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await verifySession();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { name, fields } = parsed.data;
    const type = await db.customEntryType.create({
      data: { userId, name, fields: fields as object[] },
      select: { id: true, name: true, fields: true },
    });
    return NextResponse.json(
      { id: type.id, name: type.name, fields: type.fields as CustomFieldDef[] },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
