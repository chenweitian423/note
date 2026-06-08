import { describe, expect, it, vi } from "vitest";
import { saveSelectedNote, shouldAutosaveNote } from "../src/components/use-note-autosave";
import type { Note } from "../src/components/note-workspace-model";

const note: Note = {
  id: "note-1",
  noteNumber: "N0001",
  title: "Title",
  content: "Body",
  updatedAt: "2026-06-09T00:00:00.000Z",
  archivedAt: null,
  tags: [],
  attachments: []
};

describe("note autosave", () => {
  it("skips saving when the loaded snapshot matches the editor fields", () => {
    expect(
      shouldAutosaveNote({
        content: "Body",
        loadedSnapshot: { id: "note-1", title: "Title", content: "Body" },
        selectedId: "note-1",
        title: "Title"
      })
    ).toBe(false);
  });

  it("patches changed notes and updates snapshot, list, dirty flag, and save state", async () => {
    const states: string[] = [];
    const dirtySinceSelect = { current: true };
    const loadedSnapshot = { current: { id: "note-1", title: "Title", content: "Body" } };
    let notes = [{ ...note, title: "Old", content: "Old" }];
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ note })
    }));

    await saveSelectedNote({
      content: "Body",
      dirtySinceSelect,
      fetchImpl,
      loadedSnapshot,
      selectedId: "note-1",
      setNotes: (updater) => {
        notes = updater(notes);
      },
      setSaveState: (state) => states.push(state),
      title: "Title"
    });

    expect(fetchImpl).toHaveBeenCalledWith("/api/notes/note-1", expect.objectContaining({ method: "PATCH" }));
    expect(loadedSnapshot.current).toEqual({ id: "note-1", title: "Title", content: "Body" });
    expect(notes).toEqual([note]);
    expect(dirtySinceSelect.current).toBe(false);
    expect(states).toEqual(["saving", "saved"]);
  });

  it("marks autosave errors when the patch request fails", async () => {
    const states: string[] = [];

    await saveSelectedNote({
      content: "Body",
      dirtySinceSelect: { current: true },
      fetchImpl: vi.fn(async () => ({ ok: false, json: async () => ({}) })),
      loadedSnapshot: { current: null },
      selectedId: "note-1",
      setNotes: () => undefined,
      setSaveState: (state) => states.push(state),
      title: "Title"
    });

    expect(states).toEqual(["saving", "error"]);
  });
});
