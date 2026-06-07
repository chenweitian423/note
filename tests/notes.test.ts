import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deleteAttachmentFiles } from "../src/lib/attachment-files";
import {
  archiveNote,
  createAttachment,
  createNote,
  createTag,
  deleteNote,
  getAttachment,
  getNote,
  getNoteByNumber,
  listNotes,
  restoreNote,
  setNoteTags,
  updateNote
} from "../src/lib/notes";
import { createTestDb } from "../src/test/create-test-db";

describe("note data access", () => {
  it("creates, updates, searches, tags, and archives notes", async () => {
    const db = await createTestDb();
    const note = createNote(db, { title: "第一篇", content: "# Hello" });
    expect(note.title).toBe("第一篇");
    expect(note.noteNumber).toBe("N0001");
    const secondNote = createNote(db, { title: "第二篇" });
    expect(secondNote.noteNumber).toBe("N0002");

    updateNote(db, note.id, { content: "updated # Hello" });
    expect(getNote(db, note.id)?.content).toBe("updated # Hello");
    expect(getNoteByNumber(db, "N0001")?.id).toBe(note.id);

    const tag = createTag(db, { name: "工作", color: "#2563eb" });
    setNoteTags(db, note.id, [tag.id]);
    expect(getNote(db, note.id)?.tags[0]?.name).toBe("工作");
    expect(listNotes(db, { query: "Hello" })).toHaveLength(1);

    archiveNote(db, note.id);
    archiveNote(db, secondNote.id);
    expect(listNotes(db, { includeArchived: false })).toHaveLength(0);
  });

  it("lists archived notes separately and restores them to the active list", async () => {
    const db = await createTestDb();
    const active = createNote(db, { title: "当前笔记" });
    const archived = createNote(db, { title: "旧日记" });

    archiveNote(db, archived.id);

    expect(listNotes(db).map((note) => note.id)).toEqual([active.id]);
    expect(listNotes(db, { archiveOnly: true }).map((note) => note.id)).toEqual([archived.id]);

    restoreNote(db, archived.id);

    expect(listNotes(db, { archiveOnly: true })).toHaveLength(0);
    expect(listNotes(db).map((note) => note.id)).toEqual([archived.id, active.id]);
  });

  it("permanently deletes note metadata and related attachment rows", async () => {
    const db = await createTestDb();
    const note = createNote(db, { title: "待删除" });
    const tag = createTag(db, { name: "清理", color: "#dc2626" });
    const attachment = createAttachment(db, {
      noteId: note.id,
      filename: "cleanup.txt",
      storedName: "stored-cleanup.txt",
      mimeType: "text/plain",
      size: 12
    });
    setNoteTags(db, note.id, [tag.id]);

    deleteNote(db, note.id);

    expect(getNote(db, note.id)).toBeNull();
    expect(getAttachment(db, attachment.id)).toBeNull();
    expect(listNotes(db, { includeArchived: true })).toHaveLength(0);
  });

  it("deletes attachment files without following unsafe stored names", () => {
    const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), "notepad-uploads-"));
    const safeFile = path.join(uploadsDir, "safe.txt");
    const outsideFile = path.join(os.tmpdir(), `notepad-outside-${Date.now()}.txt`);
    fs.writeFileSync(safeFile, "safe");
    fs.writeFileSync(outsideFile, "outside");

    deleteAttachmentFiles(uploadsDir, [
      {
        id: "safe",
        noteId: "note",
        filename: "safe.txt",
        storedName: "safe.txt",
        mimeType: "text/plain",
        size: 4,
        createdAt: new Date().toISOString()
      },
      {
        id: "unsafe",
        noteId: "note",
        filename: "outside.txt",
        storedName: path.relative(uploadsDir, outsideFile),
        mimeType: "text/plain",
        size: 7,
        createdAt: new Date().toISOString()
      }
    ]);

    expect(fs.existsSync(safeFile)).toBe(false);
    expect(fs.existsSync(outsideFile)).toBe(true);
    fs.rmSync(uploadsDir, { recursive: true, force: true });
    fs.rmSync(outsideFile, { force: true });
  });

  it("looks up attachments by id", async () => {
    const db = await createTestDb();
    const note = createNote(db, { title: "附件", content: "" });
    const attachment = createAttachment(db, {
      noteId: note.id,
      filename: "report.pdf",
      storedName: "stored-report.pdf",
      mimeType: "application/pdf",
      size: 123
    });

    expect(getAttachment(db, attachment.id)?.filename).toBe("report.pdf");
    expect(getAttachment(db, "missing")).toBeNull();
  });
});
