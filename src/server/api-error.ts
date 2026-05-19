import { NextResponse } from "next/server";

function prismaCode(err: unknown): string | null {
  if (err instanceof Error && "code" in err) return (err as { code: string }).code;
  return null;
}

export function handleApiError(err: unknown): NextResponse {
  const code = prismaCode(err);
  if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
