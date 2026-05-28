import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, persistDb } from "@/lib/db";
import { createTag, listTags } from "@/lib/notes";
import { requireSession } from "@/lib/require-session";

const schema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;
  return NextResponse.json({ tags: listTags(await getDb()) });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const db = await getDb();
  const tag = createTag(db, parsed.data);
  persistDb(db);
  return NextResponse.json({ tag }, { status: 201 });
}
