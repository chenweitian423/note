"use client";

import { NoteShellView } from "./note-shell-view";
import { useNoteWorkspace } from "./use-note-workspace";

export function NoteShell() {
  const workspace = useNoteWorkspace();
  return <NoteShellView workspace={workspace} />;
}
