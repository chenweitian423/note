import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAttachmentFiles } from "@/lib/attachment-files";
import { getDb, persistDb } from "@/lib/db";
import { archiveNote, deleteNote, getNote, restoreNote, updateNote } from "@/lib/notes";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";
import { noteContentSchema } from "@/lib/validation";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: noteContentSchema.optional(),
  archived: z.boolean().optional(),
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
  if (!getNote(db, id)) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  const { archived, ...patch } = parsed.data;
  const note =
    archived === false
      ? (restoreNote(db, id), getNote(db, id))
      : archived === true
        ? (archiveNote(db, id), getNote(db, id))
        : updateNote(db, id, patch);
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
  const existingNote = getNote(db, id);
  if (!existingNote) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("permanent") === "true") {
    deleteAttachmentFiles(getUploadsDir(), existingNote.attachments);
    deleteNote(db, id);
  } else {
    archiveNote(db, id);
  }
  persistDb(db);
  return NextResponse.json({ ok: true });
}
