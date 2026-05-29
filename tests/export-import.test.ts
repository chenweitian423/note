import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportArchive } from "../src/lib/export";
import { importArchive } from "../src/lib/import";
import { createAttachment, createNote, listNotes } from "../src/lib/notes";
import { readZipEntries } from "../src/lib/zip";
import { createTestDb } from "../src/test/create-test-db";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-"));
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
    const names = (await readZipEntries(zip)).map((entry) => entry.name);
    expect(names).toContain("manifest.json");
    expect(names).toContain("notes.json");
    expect(names).toContain(`notes/${note.slug}.md`);

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
});
