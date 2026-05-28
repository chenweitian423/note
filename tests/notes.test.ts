import { describe, expect, it } from "vitest";
import {
  archiveNote,
  createNote,
  createTag,
  getNote,
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

    updateNote(db, note.id, { content: "updated # Hello" });
    expect(getNote(db, note.id)?.content).toBe("updated # Hello");

    const tag = createTag(db, { name: "工作", color: "#2563eb" });
    setNoteTags(db, note.id, [tag.id]);
    expect(getNote(db, note.id)?.tags[0]?.name).toBe("工作");
    expect(listNotes(db, { query: "Hello" })).toHaveLength(1);

    archiveNote(db, note.id);
    expect(listNotes(db, { includeArchived: false })).toHaveLength(0);
  });
});
