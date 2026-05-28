import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, persistDb } from "@/lib/db";
import { createNote, listNotes } from "@/lib/notes";
import { requireSession } from "@/lib/require-session";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional()
});

export async function GET(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const db = await getDb();
  const notes = listNotes(db, {
    query: url.searchParams.get("q") ?? undefined,
    includeArchived: url.searchParams.get("includeArchived") === "true",
    tagId: url.searchParams.get("tagId") ?? undefined
  });
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const db = await getDb();
  const note = createNote(db, parsed.data);
  persistDb(db);
  return NextResponse.json({ note }, { status: 201 });
}
