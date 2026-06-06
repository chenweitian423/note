import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import type { Database } from "sql.js";
import { sha256Hex } from "./checksum";
import { safeZipPath } from "./filenames";
import { listNotes } from "./notes";

export async function exportArchive(db: Database, uploadsDir: string): Promise<Buffer> {
  const notes = listNotes(db, { includeArchived: true });
  const attachmentCount = notes.reduce((count, note) => count + note.attachments.length, 0);
  const notesJson = JSON.stringify({ notes }, null, 2);
  const manifest = {
    version: 1,
    app: "online-notepad",
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    attachmentCount,
    checksums: {
      notesJsonSha256: sha256Hex(notesJson)
    }
  };

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append(notesJson, { name: "notes.json" });

  for (const note of notes) {
    archive.append(note.content, { name: safeZipPath("notes", `${note.slug || note.id}.md`) });
    for (const attachment of note.attachments) {
      const filePath = path.join(uploadsDir, attachment.storedName);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: safeZipPath("attachments", note.id, attachment.filename) });
      }
    }
  }

  await archive.finalize();
  return done;
}
