"use client";

import { ChangeEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalizeNote, type Note, type SaveState } from "./note-workspace-model";
import { useApiKeyManager } from "./use-api-key-manager";
import { useBackupManager } from "./use-backup-manager";
import { useEditorActions } from "./use-editor-actions";
import { useNoteAutosave } from "./use-note-autosave";

export function useNoteWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<Note[] | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [codeLanguage, setCodeLanguage] = useState("bash");
  const [activeMobilePane, setActiveMobilePane] = useState<"list" | "editor" | "preview">("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const checkedNotes = useMemo(
    () => notes.filter((note) => selectedNoteIds.includes(note.id)),
    [notes, selectedNoteIds]
  );
  const loadedSnapshot = useRef<{ id: string; title: string; content: string } | null>(null);
  const notesRequestId = useRef(0);
  const dirtySinceSelect = useRef(false);
  const backupManager = useBackupManager({ loadNotes });
  const apiKeyManager = useApiKeyManager();
  const editorActions = useEditorActions({
    codeLanguage,
    content,
    loadNotes,
    selectedId,
    setContent,
    textareaRef
  });
  useNoteAutosave({
    content,
    dirtySinceSelect,
    loadedSnapshot,
    selectedId,
    setNotes,
    setSaveState,
    title
  });

  useEffect(() => {
    void loadNotes();
  }, []);

  useLayoutEffect(() => {
    if (selectedNote && loadedSnapshot.current?.id !== selectedNote.id) {
      dirtySinceSelect.current = false;
      loadedSnapshot.current = {
        id: selectedNote.id,
        title: selectedNote.title,
        content: selectedNote.content
      };
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
    }
  }, [selectedNote?.id]);

  async function loadNotes(search = query, archivedMode = showArchived) {
    const requestId = ++notesRequestId.current;
    const params = new URLSearchParams();
    if (search) {
      params.set("q", search);
    }
    if (archivedMode) {
      params.set("archived", "true");
    }
    const queryString = params.toString();
    const response = await fetch(`/api/notes${queryString ? `?${queryString}` : ""}`);
    if (!response.ok) return;
    const data = (await response.json()) as { notes: Note[] };
    if (requestId !== notesRequestId.current) {
      return;
    }
    const nextNotes = data.notes.map(normalizeNote);
    setNotes(nextNotes);
    const requestedNoteNumber = new URLSearchParams(window.location.search).get("note");
    const requestedNote = requestedNoteNumber
      ? nextNotes.find((note) => note.noteNumber.toLowerCase() === requestedNoteNumber.toLowerCase())
      : null;
    const nextSelected = requestedNote ?? nextNotes.find((note) => note.id === selectedId) ?? nextNotes[0] ?? null;
    if (nextSelected?.id !== selectedId) {
      setSelectedId(nextSelected?.id ?? "");
    }
    setSelectedNoteIds((current) => current.filter((noteId) => nextNotes.some((note) => note.id === noteId)));
  }

  async function createNewNote() {
    notesRequestId.current += 1;
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "未命名笔记", content: "# 新笔记\n\n开始记录..." })
    });
    if (!response.ok) return;
    const data = (await response.json()) as { note: Note };
    const note = normalizeNote(data.note);
    setNotes((current) => [note, ...current]);
    selectNote(note);
    dirtySinceSelect.current = false;
    loadedSnapshot.current = {
      id: note.id,
      title: note.title,
      content: note.content
    };
    setTitle(note.title);
    setContent(note.content);
    setActiveMobilePane("editor");
    setSelectedNoteIds([]);
  }

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setActiveMobilePane("editor");
    const url = new URL(window.location.href);
    url.searchParams.set("note", note.noteNumber);
    window.history.replaceState(null, "", url.toString());
  }

  function toggleNoteSelection(noteId: string, checked: boolean) {
    setSelectedNoteIds((current) => {
      if (checked) {
        return current.includes(noteId) ? current : [...current, noteId];
      }
      return current.filter((id) => id !== noteId);
    });
  }

  function selectAllVisibleNotes(checked: boolean) {
    setSelectedNoteIds(checked ? notes.map((note) => note.id) : []);
  }

  async function runBulkNoteAction(action: "archive" | "restore" | "delete", noteIds = selectedNoteIds) {
    const uniqueNoteIds = Array.from(new Set(noteIds));
    if (uniqueNoteIds.length === 0) return false;
    const response = await fetch("/api/notes/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, noteIds: uniqueNoteIds })
    });
    if (!response.ok) return false;
    setNotes((current) => current.filter((note) => !uniqueNoteIds.includes(note.id)));
    setSelectedNoteIds((current) => current.filter((noteId) => !uniqueNoteIds.includes(noteId)));
    if (uniqueNoteIds.includes(selectedId)) {
      setSelectedId("");
    }
    setSaveState("saved");
    return true;
  }

  async function archiveSelectedNotes() {
    await runBulkNoteAction("archive");
  }

  async function restoreSelectedNotes() {
    await runBulkNoteAction("restore");
  }

  async function archiveSelectedNote() {
    if (!selectedId) return;
    await fetch(`/api/notes/${selectedId}`, { method: "DELETE" });
    setNotes((current) => current.filter((note) => note.id !== selectedId));
    setSelectedNoteIds((current) => current.filter((noteId) => noteId !== selectedId));
    setSelectedId("");
  }

  async function restoreSelectedNote() {
    if (!selectedId) return;
    const response = await fetch(`/api/notes/${selectedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: false })
    });
    if (!response.ok) return;
    setNotes((current) => current.filter((note) => note.id !== selectedId));
    setSelectedNoteIds((current) => current.filter((noteId) => noteId !== selectedId));
    setSelectedId("");
    setSaveState("saved");
  }

  async function deleteSelectedNotePermanently() {
    if (!noteDeleteTarget) return;
    const deleted = await runBulkNoteAction(
      "delete",
      noteDeleteTarget.map((note) => note.id)
    );
    if (!deleted) return;
    setNoteDeleteTarget(null);
  }

  function toggleArchiveBox() {
    const next = !showArchived;
    setShowArchived(next);
    setSelectedId("");
    setSelectedNoteIds([]);
    void loadNotes(query, next);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return {
    notes,
    selectedId,
    setSelectedId,
    query,
    setQuery,
    title,
    setTitle,
    content,
    setContent,
    showArchived,
    noteDeleteTarget,
    setNoteDeleteTarget,
    selectedNoteIds,
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
    selectedNote,
    checkedNotes,
    dirtySinceSelect,
    loadNotes,
    createNewNote,
    selectNote,
    toggleNoteSelection,
    selectAllVisibleNotes,
    runBulkNoteAction,
    archiveSelectedNotes,
    restoreSelectedNotes,
    archiveSelectedNote,
    restoreSelectedNote,
    deleteSelectedNotePermanently,
    toggleArchiveBox,
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
