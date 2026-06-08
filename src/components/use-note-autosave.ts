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

type AutosaveSnapshot = LoadedSnapshot | null;

type ShouldAutosaveOptions = {
  content: string;
  loadedSnapshot: AutosaveSnapshot;
  selectedId: string;
  title: string;
};

type SaveSelectedNoteOptions = NoteAutosaveOptions & {
  fetchImpl?: typeof fetch;
};

export function shouldAutosaveNote({ content, loadedSnapshot, selectedId, title }: ShouldAutosaveOptions) {
  if (!selectedId) return false;
  return !(loadedSnapshot?.id === selectedId && loadedSnapshot.title === title && loadedSnapshot.content === content);
}

export async function saveSelectedNote({
  content,
  dirtySinceSelect,
  fetchImpl = fetch,
  loadedSnapshot,
  selectedId,
  setNotes,
  setSaveState,
  title
}: SaveSelectedNoteOptions) {
  setSaveState("saving");
  const response = await fetchImpl(`/api/notes/${selectedId}`, {
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
}

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
    if (!shouldAutosaveNote({ content, loadedSnapshot: loadedSnapshot.current, selectedId, title })) {
      return;
    }
    const handle = window.setTimeout(async () => {
      await saveSelectedNote({
        content,
        dirtySinceSelect,
        loadedSnapshot,
        selectedId,
        setNotes,
        setSaveState,
        title
      });
    }, 600);
    return () => window.clearTimeout(handle);
  }, [content, dirtySinceSelect, loadedSnapshot, selectedId, setNotes, setSaveState, title]);
}
