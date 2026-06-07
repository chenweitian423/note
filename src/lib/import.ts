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

export type ImportArchivePreview =
  | {
      valid: true;
      app: string | null;
      exportedAt: string;
      noteCount: number;
      attachmentCount: number;
      checksumValid: boolean | null;
    }
  | {
      valid: false;
      error: string;
    };

export async function importArchive(
  db: Database,
  uploadsDir: string,
  zipBuffer: Buffer
): Promise<{ imported: number }> {
  const { byName, manifest, parsed } = await parseImportArchive(zipBuffer);
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

export async function inspectImportArchive(zipBuffer: Buffer): Promise<ImportArchivePreview> {
  try {
    const { manifest, checksumValid } = await parseImportArchive(zipBuffer);
    return {
      valid: true,
      app: manifest.app ?? null,
      exportedAt: manifest.exportedAt,
      noteCount: manifest.noteCount,
      attachmentCount: manifest.attachmentCount,
      checksumValid
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "ZIP 校验失败"
    };
  }
}

async function parseImportArchive(zipBuffer: Buffer) {
  const entries = await readZipEntries(zipBuffer);
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));

  const manifestRaw = byName.get("manifest.json");
  const notesRaw = byName.get("notes.json");
  if (!manifestRaw || !notesRaw) {
    throw new Error("ZIP 缺少 manifest.json 或 notes.json");
  }
  const manifest = manifestSchema.parse(JSON.parse(manifestRaw.toString("utf8")));
  let checksumValid: boolean | null = null;
  if (manifest.checksums?.notesJsonSha256 && sha256Hex(notesRaw) !== manifest.checksums.notesJsonSha256) {
    throw new Error("notes.json checksum mismatch");
  }
  if (manifest.checksums?.notesJsonSha256) {
    checksumValid = true;
  }
  const parsed = notesSchema.parse(JSON.parse(notesRaw.toString("utf8")));
  return { byName, manifest, parsed, checksumValid };
}
