"use client";

import { ChangeEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Attachment = {
  id: string;
  filename: string;
  size: number;
};

type Note = {
  id: string;
  noteNumber: string;
  title: string;
  content: string;
  updatedAt: string;
  archivedAt: string | null;
  tags: Tag[];
  attachments: Attachment[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

type ApiKey = {
  id: string;
  name: string;
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type CreatedApiKey = ApiKey & {
  key: string;
};

type Backup = {
  filename: string;
  size: number;
  createdAt: string;
};

type BackupSummary = {
  count: number;
  totalSize: number;
  retention: number;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
};

type ImportPreview =
  | {
      valid: true;
      app: string | null;
      exportedAt: string;
      noteCount: number;
      attachmentCount: number;
      checksumValid: boolean | null;
    }
  | {
      valid: false;
      error: string;
    };

type AutoBackupStatus = {
  enabled: boolean;
  intervalHours: number;
  retention: number;
  running: boolean;
  latestBackupCreatedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

type HealthStatus = {
  ok: boolean;
  version: string;
  checkedAt: string;
  checks: Record<string, boolean>;
  autoBackup: AutoBackupStatus;
};

function normalizeNote(note: Note): Note {
  return {
    ...note,
    tags: note.tags ?? [],
    attachments: note.attachments ?? []
  };
}

function withoutSecret(apiKey: CreatedApiKey): ApiKey {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keySuffix: apiKey.keySuffix,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt
  };
}

function summarizeBackupList(items: Backup[], retention: number): BackupSummary {
  const createdTimes = items.map((backup) => backup.createdAt).sort();
  return {
    count: items.length,
    totalSize: items.reduce((total, backup) => total + backup.size, 0),
    retention,
    oldestCreatedAt: createdTimes[0] ?? null,
    newestCreatedAt: createdTimes.at(-1) ?? null
  };
}

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
  const [importing, setImporting] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyName, setApiKeyName] = useState("curl");
  const [newApiKey, setNewApiKey] = useState<CreatedApiKey | null>(null);
  const [copiedApiKeyId, setCopiedApiKeyId] = useState("");
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupDeleteTarget, setBackupDeleteTarget] = useState<Backup | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [backupVerifyResults, setBackupVerifyResults] = useState<Record<string, ImportPreview>>({});
  const [backupStatus, setBackupStatus] = useState("");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const checkedNotes = useMemo(
    () => notes.filter((note) => selectedNoteIds.includes(note.id)),
    [notes, selectedNoteIds]
  );
  const loadedSnapshot = useRef<{ id: string; title: string; content: string } | null>(null);
  const notesRequestId = useRef(0);
  const dirtySinceSelect = useRef(false);

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
  }, [title, content, selectedId]);

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

  function insertSnippet(before: string, after = "") {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${before}${selected || "文本"}${after}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  function insertCodeBlock() {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end).trimEnd();
    const code = selected || "在这里输入代码";
    const prefix = start > 0 && !content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < content.length && !content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const block = `${prefix}\`\`\`${codeLanguage}\n${code}\n\`\`\`${suffix}`;
    const next = `${content.slice(0, start)}${block}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  async function exportZip() {
    window.location.href = "/api/export";
  }

  async function importZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: form });
    const preview = (await response.json().catch(() => ({ valid: false, error: "ZIP 校验失败" }))) as ImportPreview;
    setImporting(false);
    setPendingImportFile(file);
    setImportPreview(preview);
    event.target.value = "";
  }

  async function restoreBackupZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBackupStatus("正在校验备份 ZIP...");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: form });
    const preview = (await response.json().catch(() => ({ valid: false, error: "ZIP 校验失败" }))) as ImportPreview;
    event.target.value = "";
    setPendingImportFile(file);
    setImportPreview(preview);
    if (!preview.valid) {
      setBackupStatus(`校验失败：${preview.error}`);
      return;
    }
    setBackupStatus("校验通过，等待确认导入");
  }

  async function confirmImportZip() {
    if (!pendingImportFile) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", pendingImportFile);
    const response = await fetch("/api/import", { method: "POST", body: form });
    setImporting(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setImportPreview({ valid: false, error: data?.error ?? "导入失败" });
      setBackupStatus(data?.error ? `导入失败：${data.error}` : "导入失败");
      return;
    }
    await loadNotes("");
    setPendingImportFile(null);
    setImportPreview(null);
    setBackupStatus("ZIP 已导入");
  }

  function cancelImportZip() {
    setPendingImportFile(null);
    setImportPreview(null);
    setBackupStatus("");
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    const form = new FormData();
    form.set("noteId", selectedId);
    form.set("file", file);
    await fetch("/api/attachments", { method: "POST", body: form });
    await loadNotes();
    event.target.value = "";
  }

  async function openBackupDialog() {
    setBackupDialogOpen(true);
    await Promise.all([loadBackups(), loadHealth()]);
  }

  async function openSettingsDialog() {
    setSettingsDialogOpen(true);
    await loadHealth();
  }

  async function loadHealth() {
    const response = await fetch("/api/health");
    if (!response.ok) return;
    setHealth((await response.json()) as HealthStatus);
  }

  async function loadBackups() {
    const response = await fetch("/api/backups");
    if (!response.ok) return;
    const data = (await response.json()) as { backups: Backup[]; summary: BackupSummary };
    setBackups(data.backups);
    setBackupSummary(data.summary);
  }

  async function createBackupArchive() {
    setBackupStatus("正在创建备份...");
    const response = await fetch("/api/backups", { method: "POST" });
    if (!response.ok) {
      setBackupStatus("备份失败");
      return;
    }
    const data = (await response.json()) as { backup: Backup };
    setBackups((current) => {
      const nextBackups = [data.backup, ...current.filter((backup) => backup.filename !== data.backup.filename)];
      setBackupSummary(summarizeBackupList(nextBackups, backupSummary?.retention ?? 10));
      return nextBackups;
    });
    setBackupStatus("备份已创建");
  }

  async function deleteBackupArchive() {
    if (!backupDeleteTarget) return;
    const backup = backupDeleteTarget;
    const response = await fetch(`/api/backups/${encodeURIComponent(backup.filename)}`, { method: "DELETE" });
    if (!response.ok) {
      setBackupStatus("删除备份失败");
      return;
    }
    setBackups((current) => {
      const nextBackups = current.filter((item) => item.filename !== backup.filename);
      setBackupSummary(summarizeBackupList(nextBackups, backupSummary?.retention ?? 10));
      return nextBackups;
    });
    setBackupDeleteTarget(null);
    setBackupStatus("备份已删除");
  }

  async function verifyBackupArchive(backup: Backup) {
    setBackupStatus(`正在校验 ${backup.filename}...`);
    const response = await fetch(`/api/backups/${encodeURIComponent(backup.filename)}/verify`, { method: "POST" });
    const preview = (await response.json().catch(() => ({ valid: false, error: "备份校验失败" }))) as ImportPreview;
    setBackupVerifyResults((current) => ({ ...current, [backup.filename]: preview }));
    setBackupStatus(preview.valid ? "备份可恢复" : `备份不可恢复：${preview.error}`);
  }

  async function openApiKeyDialog() {
    setApiKeyDialogOpen(true);
    await loadApiKeys();
  }

  async function loadApiKeys() {
    const response = await fetch("/api/api-keys");
    if (!response.ok) return;
    const data = (await response.json()) as { apiKeys: ApiKey[] };
    setApiKeys(data.apiKeys);
  }

  async function createApiKey() {
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: apiKeyName })
    });
    if (!response.ok) return;
    const data = (await response.json()) as { apiKey: CreatedApiKey };
    setNewApiKey(data.apiKey);
    setApiKeys((current) => [withoutSecret(data.apiKey), ...current]);
  }

  async function deleteApiKey(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((current) => current.filter((apiKey) => apiKey.id !== id));
  }

  async function copyText(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  async function copyNewApiKey(apiKey: CreatedApiKey) {
    await copyText(apiKey.key);
    setCopiedApiKeyId(apiKey.id);
    window.setTimeout(() => setCopiedApiKeyId(""), 1200);
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
    importing,
    apiKeyDialogOpen,
    setApiKeyDialogOpen,
    apiKeys,
    apiKeyName,
    setApiKeyName,
    newApiKey,
    copiedApiKeyId,
    backupDialogOpen,
    setBackupDialogOpen,
    backups,
    backupSummary,
    backupDeleteTarget,
    setBackupDeleteTarget,
    importPreview,
    pendingImportFile,
    backupVerifyResults,
    backupStatus,
    settingsDialogOpen,
    setSettingsDialogOpen,
    health,
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
    insertSnippet,
    insertCodeBlock,
    exportZip,
    importZip,
    restoreBackupZip,
    confirmImportZip,
    cancelImportZip,
    uploadAttachment,
    openBackupDialog,
    openSettingsDialog,
    createBackupArchive,
    deleteBackupArchive,
    verifyBackupArchive,
    openApiKeyDialog,
    createApiKey,
    deleteApiKey,
    copyNewApiKey
  };
}

export type NoteWorkspace = ReturnType<typeof useNoteWorkspace>;
