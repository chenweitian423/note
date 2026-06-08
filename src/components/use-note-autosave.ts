"use client";

import { MutableRefObject, useEffect } from "react";
import { normalizeNote, type Note, type SaveState } from "./note-workspace-model";

type LoadedSnapshot = {
  id: string;
  title: string;
  content: string;
};

type NoteAutosaveOptions = {
  content: string;
  dirtySinceSelect: MutableRefObject<boolean>;
  loadedSnapshot: MutableRefObject<LoadedSnapshot | null>;
  selectedId: string;
  setNotes: (updater: (current: Note[]) => Note[]) => void;
  setSaveState: (saveState: SaveState) => void;
  title: string;
};

export function useNoteAutosave({
  content,
  dirtySinceSelect,
  loadedSnapshot,
  selectedId,
  setNotes,
  setSaveState,
  title
}: NoteAutosaveOptions) {
  useEffect(() => {
    if (!selectedId) return;
    if (
      loadedSnapshot.current?.id === selectedId &&
      loadedSnapshot.current.title === title &&
      loadedSnapshot.current.content === content
    ) {
      return;
    }
    setSaveState("saving");
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/notes/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      const data = (await response.json()) as { note: Note };
      const nextNote = normalizeNote(data.note);
      loadedSnapshot.current = {
        id: nextNote.id,
        title: nextNote.title,
        content: nextNote.content
      };
      dirtySinceSelect.current = false;
      setNotes((current) => current.map((note) => (note.id === nextNote.id ? nextNote : note)));
      setSaveState("saved");
    }, 600);
    return () => window.clearTimeout(handle);
  }, [content, dirtySinceSelect, loadedSnapshot, selectedId, setNotes, setSaveState, title]);
}
