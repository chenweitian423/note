import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAttachmentFiles } from "@/lib/attachment-files";
import { getDb, persistDb } from "@/lib/db";
import { archiveNotes, deleteNotes, getNote, restoreNotes } from "@/lib/notes";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

const bulkSchema = z.object({
  action: z.enum(["archive", "restore", "delete"]),
  noteIds: z.array(z.string().min(1)).min(1).max(200)
});

export async function POST(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const noteIds = Array.from(new Set(parsed.data.noteIds));
  const db = await getDb();
  const notes = noteIds.map((noteId) => getNote(db, noteId)).filter((note) => note !== null);

  if (parsed.data.action === "archive") {
    archiveNotes(db, notes.map((note) => note.id));
  } else if (parsed.data.action === "restore") {
    restoreNotes(db, notes.map((note) => note.id));
  } else {
    for (const note of notes) {
      deleteAttachmentFiles(getUploadsDir(), note.attachments);
    }
    deleteNotes(db, notes.map((note) => note.id));
  }

  persistDb(db);
  return NextResponse.json({ ok: true, count: notes.length });
}
