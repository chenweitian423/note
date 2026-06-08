import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import archiver from "archiver";
import { describe, expect, it } from "vitest";
import { exportArchive } from "../src/lib/export";
import { importArchive, inspectImportArchive } from "../src/lib/import";
import { createAttachment, createNote, listNotes } from "../src/lib/notes";
import { readZipEntries } from "../src/lib/zip";
import { createTestDb } from "../src/test/create-test-db";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-"));
}

async function zipEntries(entries: { name: string; data: Buffer }[]): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });
  for (const entry of entries) {
    archive.append(entry.data, { name: entry.name });
  }
  await archive.finalize();
  return done;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

describe("zip export and import", () => {
  it("exports required files and imports into an empty database", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const note = createNote(db, { title: "迁移测试", content: "# 内容" });
    fs.writeFileSync(path.join(uploadsDir, "sample.txt"), "hello");
    createAttachment(db, {
      noteId: note.id,
      filename: "sample.txt",
      storedName: "sample.txt",
      mimeType: "text/plain",
      size: 5
    });

    const zip = await exportArchive(db, uploadsDir);
    const entries = await readZipEntries(zip);
    const names = entries.map((entry) => entry.name);
    expect(names).toContain("manifest.json");
    expect(names).toContain("notes.json");
    expect(names).toContain(`notes/${note.slug}.md`);
    const byName = new Map(entries.map((entry) => [entry.name, entry.data]));
    const manifest = JSON.parse(byName.get("manifest.json")!.toString("utf8"));
    const notesJson = byName.get("notes.json")!;
    expect(manifest.checksums.notesJsonSha256).toBe(sha256(notesJson));

    const nextDb = await createTestDb();
    await importArchive(nextDb, tempDir(), zip);
    const imported = listNotes(nextDb, {});
    expect(imported).toHaveLength(1);
    expect(imported[0].title).toBe("迁移测试");
    expect(imported[0].attachments).toHaveLength(1);
  });
  it("sanitizes exported attachment names and enforces zip limits", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const note = createNote(db, { title: "zip safety", content: "content" });
    fs.writeFileSync(path.join(uploadsDir, "stored.txt"), "hello");
    createAttachment(db, {
      noteId: note.id,
      filename: "../evil.txt",
      storedName: "stored.txt",
      mimeType: "text/plain",
      size: 5
    });

    const zip = await exportArchive(db, uploadsDir);
    const names = (await readZipEntries(zip)).map((entry) => entry.name);
    expect(names).toContain(`attachments/${note.id}/evil.txt`);
    expect(names).not.toContain(`attachments/${note.id}/../evil.txt`);
    await expect(readZipEntries(zip, { maxEntries: 1 })).rejects.toThrow(/too many/i);
    await expect(readZipEntries(zip, { maxEntryBytes: 1 })).rejects.toThrow(/too large/i);
  });
  it("rejects imports when notes.json checksum does not match the manifest", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    createNote(db, { title: "signed export", content: "original" });

    const zip = await exportArchive(db, uploadsDir);
    const entries = await readZipEntries(zip);
    const tampered = await zipEntries(
      entries.map((entry) =>
        entry.name === "notes.json"
          ? { ...entry, data: Buffer.from(JSON.stringify({ notes: [] }), "utf8") }
          : entry
      )
    );

    const nextDb = await createTestDb();
    await expect(importArchive(nextDb, tempDir(), tampered)).rejects.toThrow(/checksum/i);
  });

  it("previews import archives without writing to the database or uploads directory", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const note = createNote(db, { title: "preview", content: "content" });
    fs.writeFileSync(path.join(uploadsDir, "sample.txt"), "hello");
    createAttachment(db, {
      noteId: note.id,
      filename: "sample.txt",
      storedName: "sample.txt",
      mimeType: "text/plain",
      size: 5
    });

    const zip = await exportArchive(db, uploadsDir);
    const nextDb = await createTestDb();
    const nextUploadsDir = tempDir();
    const preview = await inspectImportArchive(zip);

    expect(preview).toMatchObject({
      valid: true,
      checksumValid: true,
      noteCount: 1,
      attachmentCount: 1
    });
    expect(preview.exportedAt).toEqual(expect.any(String));
    expect(preview.app).toBe("online-notepad");
    expect(listNotes(nextDb, {})).toHaveLength(0);
    expect(fs.readdirSync(nextUploadsDir)).toHaveLength(0);
  });

  it("reports invalid import archives without throwing", async () => {
    const preview = await inspectImportArchive(Buffer.from("not a zip"));

    expect(preview.valid).toBe(false);
    expect(preview.error).toEqual(expect.any(String));
  });

  it("rejects imports when manifest counts do not match the archive payload", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    createNote(db, { title: "counted export", content: "original" });

    const zip = await exportArchive(db, uploadsDir);
    const entries = await readZipEntries(zip);
    const byName = new Map(entries.map((entry) => [entry.name, entry.data]));
    const manifest = JSON.parse(byName.get("manifest.json")!.toString("utf8"));
    manifest.noteCount = 999;
    const tampered = await zipEntries(
      entries.map((entry) =>
        entry.name === "manifest.json"
          ? { ...entry, data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8") }
          : entry
      )
    );

    const nextDb = await createTestDb();
    await expect(importArchive(nextDb, tempDir(), tampered)).rejects.toThrow(/noteCount/i);
  });
});
