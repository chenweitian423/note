import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDb, persistDb } from "@/lib/db";
import { sanitizeFilename } from "@/lib/filenames";
import { createAttachment, getNote } from "@/lib/notes";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function POST(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const noteId = form.get("noteId");
  const file = form.get("file");
  if (typeof noteId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "缺少笔记或文件" }, { status: 400 });
  }

  const maxBytes = Number(process.env.MAX_ATTACHMENT_MB ?? 20) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "附件过大" }, { status: 400 });
  }

  const db = await getDb();
  if (!getNote(db, noteId)) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  const uploadsDir = getUploadsDir();
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = sanitizeFilename(file.name);
  const storedName = `${noteId}-${crypto.randomUUID()}-${path.basename(filename)}`;
  fs.writeFileSync(path.join(uploadsDir, storedName), Buffer.from(await file.arrayBuffer()));
  const attachment = createAttachment(db, {
    noteId,
    filename,
    storedName,
    mimeType: file.type || "application/octet-stream",
    size: file.size
  });
  persistDb(db);
  return NextResponse.json({ attachment }, { status: 201 });
}
