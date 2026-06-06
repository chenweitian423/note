import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { z } from "zod";
import { sha256Hex } from "./checksum";
import { sanitizeFilename } from "./filenames";
import { createAttachment, createNote, listNotes, uniqueSlug } from "./notes";
import { readZipEntries } from "./zip";

const manifestSchema = z.object({
  version: z.literal(1),
  app: z.string().optional(),
  exportedAt: z.string(),
  noteCount: z.number(),
  attachmentCount: z.number(),
  checksums: z
    .object({
      notesJsonSha256: z.string().regex(/^[a-f0-9]{64}$/)
    })
    .optional()
});

const attachmentSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  filename: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.string()
});

const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  attachments: z.array(attachmentSchema).default([])
});

const notesSchema = z.object({
  notes: z.array(noteSchema)
});

export async function importArchive(
  db: Database,
  uploadsDir: string,
  zipBuffer: Buffer
): Promise<{ imported: number }> {
  const entries = await readZipEntries(zipBuffer);
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));

  const manifestRaw = byName.get("manifest.json");
  const notesRaw = byName.get("notes.json");
  if (!manifestRaw || !notesRaw) {
    throw new Error("ZIP 缺少 manifest.json 或 notes.json");
  }

  const manifest = manifestSchema.parse(JSON.parse(manifestRaw.toString("utf8")));
  if (manifest.checksums?.notesJsonSha256 && sha256Hex(notesRaw) !== manifest.checksums.notesJsonSha256) {
    throw new Error("notes.json checksum mismatch");
  }
  const parsed = notesSchema.parse(JSON.parse(notesRaw.toString("utf8")));
  fs.mkdirSync(uploadsDir, { recursive: true });

  const existingIds = new Set(listNotes(db, { includeArchived: true }).map((note) => note.id));

  for (const importedNote of parsed.notes) {
    const noteId = existingIds.has(importedNote.id) ? randomUUID() : importedNote.id;
    const note = createNote(db, {
      id: noteId,
      title: importedNote.title,
      content: importedNote.content,
      slug: uniqueSlug(db, importedNote.slug || importedNote.title),
      createdAt: importedNote.createdAt,
      updatedAt: importedNote.updatedAt,
      archivedAt: importedNote.archivedAt
    });

    for (const attachment of importedNote.attachments) {
      const entry = byName.get(`attachments/${importedNote.id}/${attachment.filename}`);
      if (!entry) continue;
      const filename = sanitizeFilename(attachment.filename);
      const storedName = `${note.id}-${randomUUID()}-${path.basename(filename)}`;
      fs.writeFileSync(path.join(uploadsDir, storedName), entry);
      createAttachment(db, {
        noteId: note.id,
        filename,
        storedName,
        mimeType: attachment.mimeType,
        size: entry.length
      });
    }
  }

  return { imported: parsed.notes.length };
}
