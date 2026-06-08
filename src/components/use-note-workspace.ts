"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { type SaveState } from "./note-workspace-model";
import { useApiKeyManager } from "./use-api-key-manager";
import { useBackupManager } from "./use-backup-manager";
import { useEditorActions } from "./use-editor-actions";
import { useNoteCollection } from "./use-note-collection";
import { useNoteAutosave } from "./use-note-autosave";

export function useNoteWorkspace() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [codeLanguage, setCodeLanguage] = useState("bash");
  const [activeMobilePane, setActiveMobilePane] = useState<"list" | "editor" | "preview">("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedSnapshot = useRef<{ id: string; title: string; content: string } | null>(null);
  const notesRequestId = useRef(0);
  const dirtySinceSelect = useRef(false);
  const noteCollection = useNoteCollection({
    dirtySinceSelect,
    loadedSnapshot,
    notesRequestId,
    setActiveMobilePane,
    setContent,
    setSaveState,
    setTitle
  });
  const backupManager = useBackupManager({ loadNotes: noteCollection.loadNotes });
  const apiKeyManager = useApiKeyManager();
  const editorActions = useEditorActions({
    codeLanguage,
    content,
    loadNotes: noteCollection.loadNotes,
    selectedId: noteCollection.selectedId,
    setContent,
    textareaRef
  });
  useNoteAutosave({
    content,
    dirtySinceSelect,
    loadedSnapshot,
    selectedId: noteCollection.selectedId,
    setNotes: noteCollection.setNotes,
    setSaveState,
    title
  });

  useLayoutEffect(() => {
    if (noteCollection.selectedNote && loadedSnapshot.current?.id !== noteCollection.selectedNote.id) {
      dirtySinceSelect.current = false;
      loadedSnapshot.current = {
        id: noteCollection.selectedNote.id,
        title: noteCollection.selectedNote.title,
        content: noteCollection.selectedNote.content
      };
      setTitle(noteCollection.selectedNote.title);
      setContent(noteCollection.selectedNote.content);
    }
  }, [noteCollection.selectedNote?.id]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return {
    notes: noteCollection.notes,
    selectedId: noteCollection.selectedId,
    setSelectedId: noteCollection.setSelectedId,
    query: noteCollection.query,
    setQuery: noteCollection.setQuery,
    title,
    setTitle,
    content,
    setContent,
    showArchived: noteCollection.showArchived,
    noteDeleteTarget: noteCollection.noteDeleteTarget,
    setNoteDeleteTarget: noteCollection.setNoteDeleteTarget,
    selectedNoteIds: noteCollection.selectedNoteIds,
    saveState,
    codeLanguage,
    setCodeLanguage,
    activeMobilePane,
    setActiveMobilePane,
    importing: backupManager.importing,
    apiKeyDialogOpen: apiKeyManager.apiKeyDialogOpen,
    setApiKeyDialogOpen: apiKeyManager.setApiKeyDialogOpen,
    apiKeys: apiKeyManager.apiKeys,
    apiKeyName: apiKeyManager.apiKeyName,
    setApiKeyName: apiKeyManager.setApiKeyName,
    newApiKey: apiKeyManager.newApiKey,
    copiedApiKeyId: apiKeyManager.copiedApiKeyId,
    backupDialogOpen: backupManager.backupDialogOpen,
    setBackupDialogOpen: backupManager.setBackupDialogOpen,
    backups: backupManager.backups,
    backupSummary: backupManager.backupSummary,
    backupDeleteTarget: backupManager.backupDeleteTarget,
    setBackupDeleteTarget: backupManager.setBackupDeleteTarget,
    importPreview: backupManager.importPreview,
    pendingImportFile: backupManager.pendingImportFile,
    backupVerifyResults: backupManager.backupVerifyResults,
    backupStatus: backupManager.backupStatus,
    settingsDialogOpen: backupManager.settingsDialogOpen,
    setSettingsDialogOpen: backupManager.setSettingsDialogOpen,
    health: backupManager.health,
    textareaRef,
    selectedNote: noteCollection.selectedNote,
    checkedNotes: noteCollection.checkedNotes,
    dirtySinceSelect,
    loadNotes: noteCollection.loadNotes,
    createNewNote: noteCollection.createNewNote,
    selectNote: noteCollection.selectNote,
    toggleNoteSelection: noteCollection.toggleNoteSelection,
    selectAllVisibleNotes: noteCollection.selectAllVisibleNotes,
    runBulkNoteAction: noteCollection.runBulkNoteAction,
    archiveSelectedNotes: noteCollection.archiveSelectedNotes,
    restoreSelectedNotes: noteCollection.restoreSelectedNotes,
    archiveSelectedNote: noteCollection.archiveSelectedNote,
    restoreSelectedNote: noteCollection.restoreSelectedNote,
    deleteSelectedNotePermanently: noteCollection.deleteSelectedNotePermanently,
    toggleArchiveBox: noteCollection.toggleArchiveBox,
    logout,
    insertSnippet: editorActions.insertSnippet,
    insertCodeBlock: editorActions.insertCodeBlock,
    exportZip: editorActions.exportZip,
    importZip: backupManager.importZip,
    restoreBackupZip: backupManager.restoreBackupZip,
    confirmImportZip: backupManager.confirmImportZip,
    cancelImportZip: backupManager.cancelImportZip,
    uploadAttachment: editorActions.uploadAttachment,
    openBackupDialog: backupManager.openBackupDialog,
    openSettingsDialog: backupManager.openSettingsDialog,
    createBackupArchive: backupManager.createBackupArchive,
    deleteBackupArchive: backupManager.deleteBackupArchive,
    verifyBackupArchive: backupManager.verifyBackupArchive,
    openApiKeyDialog: apiKeyManager.openApiKeyDialog,
    createApiKey: apiKeyManager.createApiKey,
    deleteApiKey: apiKeyManager.deleteApiKey,
    copyNewApiKey: apiKeyManager.copyNewApiKey
  };
}

export type NoteWorkspace = ReturnType<typeof useNoteWorkspace>;
