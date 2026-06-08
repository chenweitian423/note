"use client";

import { NoteDialogsPanel } from "./note-dialogs-panel";
import { NoteEditorPane } from "./note-editor-pane";
import { NotePreviewPane } from "./note-preview-pane";
import { NoteSidebar } from "./note-sidebar";
import type { NoteWorkspace } from "./use-note-workspace";

export function NoteShellView({ workspace }: { workspace: NoteWorkspace }) {
  return (
    <main className="workspace">
      <NoteSidebar workspace={workspace} />
      <NoteEditorPane workspace={workspace} />
      <NotePreviewPane workspace={workspace} />
      <NoteDialogsPanel workspace={workspace} />
    </main>
  );
}
