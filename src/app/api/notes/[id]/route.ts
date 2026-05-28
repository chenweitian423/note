import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, persistDb } from "@/lib/db";
import { archiveNote, getNote, updateNote } from "@/lib/notes";
import { requireSession } from "@/lib/require-session";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  tagIds: z.array(z.string()).optional()
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const note = getNote(await getDb(), id);
  return note ? NextResponse.json({ note }) : NextResponse.json({ error: "笔记不存在" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { id } = await params;
  const db = await getDb();
  const note = updateNote(db, id, parsed.data);
  if (!note) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
  persistDb(db);
  return NextResponse.json({ note });
}

export async function DELETE(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const db = await getDb();
  if (!getNote(db, id)) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
  archiveNote(db, id);
  persistDb(db);
  return NextResponse.json({ ok: true });
}
