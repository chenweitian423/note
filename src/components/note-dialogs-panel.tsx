"use client";

import { ApiKeyDialog } from "./api-key-dialog";
import { BackupDialogs } from "./backup-dialogs";
import { NoteDeleteDialog } from "./note-delete-dialog";
import { SettingsDialog } from "./settings-dialog";
import type { NoteWorkspace } from "./use-note-workspace";

export function NoteDialogsPanel({ workspace }: { workspace: NoteWorkspace }) {
  return (
    <>
      <BackupDialogs workspace={workspace} />
      <NoteDeleteDialog workspace={workspace} />
      <SettingsDialog workspace={workspace} />
      <ApiKeyDialog workspace={workspace} />
    </>
  );
}
