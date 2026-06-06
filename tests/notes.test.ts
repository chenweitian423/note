import { describe, expect, it } from "vitest";
import {
  archiveNote,
  createAttachment,
  createNote,
  createTag,
  getAttachment,
  getNote,
  getNoteByNumber,
  listNotes,
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
