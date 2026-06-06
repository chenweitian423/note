import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createBackup, getBackupByFilename, getLatestBackup, listBackups } from "../src/lib/backup";
import { createNote } from "../src/lib/notes";
import { readZipEntries } from "../src/lib/zip";
import { createTestDb } from "../src/test/create-test-db";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-backup-"));
}

describe("backup archives", () => {
  it("creates timestamped zip backups and exposes the latest backup", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const exportsDir = tempDir();
    const note = createNote(db, { title: "backup note", content: "# Backup" });

    const backup = await createBackup(db, {
      uploadsDir,
      exportsDir,
      now: () => new Date("2026-06-06T01:02:03.000Z")
    });

    expect(backup.filename).toBe("online-notepad-backup-2026-06-06T01-02-03-000Z.zip");
    expect(fs.existsSync(backup.path)).toBe(true);
    const entries = await readZipEntries(fs.readFileSync(backup.path));
    expect(entries.map((entry) => entry.name)).toContain(`notes/${note.slug}.md`);
    expect(getLatestBackup(exportsDir)?.filename).toBe(backup.filename);
  });

  it("prunes older backups beyond the retention limit", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const exportsDir = tempDir();
    createNote(db, { title: "retention", content: "content" });

    await createBackup(db, {
      uploadsDir,
      exportsDir,
      retention: 2,
      now: () => new Date("2026-06-06T01:00:00.000Z")
    });
    await createBackup(db, {
      uploadsDir,
      exportsDir,
      retention: 2,
      now: () => new Date("2026-06-06T02:00:00.000Z")
    });
    await createBackup(db, {
      uploadsDir,
      exportsDir,
      retention: 2,
      now: () => new Date("2026-06-06T03:00:00.000Z")
    });

    expect(listBackups(exportsDir).map((backup) => backup.filename)).toEqual([
      "online-notepad-backup-2026-06-06T03-00-00-000Z.zip",
      "online-notepad-backup-2026-06-06T02-00-00-000Z.zip"
    ]);
  });

  it("looks up backup files by safe filename only", async () => {
    const db = await createTestDb();
    const uploadsDir = tempDir();
    const exportsDir = tempDir();
    createNote(db, { title: "lookup", content: "content" });

    const backup = await createBackup(db, {
      uploadsDir,
      exportsDir,
      now: () => new Date("2026-06-06T04:00:00.000Z")
    });

    expect(getBackupByFilename(exportsDir, backup.filename)?.filename).toBe(backup.filename);
    expect(getBackupByFilename(exportsDir, "../app.db")).toBeNull();
    expect(getBackupByFilename(exportsDir, "not-a-backup.zip")).toBeNull();
  });
});
