import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("note shell structure", () => {
  it("keeps the page shell focused by delegating state and dialogs to extracted modules", () => {
    const noteShell = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");
    const noteShellView = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8");
    const workspaceHook = fs.readFileSync(path.join(process.cwd(), "src/components/use-note-workspace.ts"), "utf8");
    const workspaceModel = fs.readFileSync(path.join(process.cwd(), "src/components/note-workspace-model.ts"), "utf8");
    const backupManagerHook = fs.readFileSync(
      path.join(process.cwd(), "src/components/use-backup-manager.ts"),
      "utf8"
    );
    const apiKeyManagerHook = fs.readFileSync(
      path.join(process.cwd(), "src/components/use-api-key-manager.ts"),
      "utf8"
    );
    const editorActionsHook = fs.readFileSync(
      path.join(process.cwd(), "src/components/use-editor-actions.ts"),
      "utf8"
    );
    const noteAutosaveHook = fs.readFileSync(
      path.join(process.cwd(), "src/components/use-note-autosave.ts"),
      "utf8"
    );
    const noteCollectionHook = fs.readFileSync(
      path.join(process.cwd(), "src/components/use-note-collection.ts"),
      "utf8"
    );
    const workspaceToolbar = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspace-toolbar.tsx"),
      "utf8"
    );
    const noteSidebar = fs.readFileSync(path.join(process.cwd(), "src/components/note-sidebar.tsx"), "utf8");
    const noteEditorPane = fs.readFileSync(path.join(process.cwd(), "src/components/note-editor-pane.tsx"), "utf8");
    const notePreviewPane = fs.readFileSync(path.join(process.cwd(), "src/components/note-preview-pane.tsx"), "utf8");
    const noteDialogsPanel = fs.readFileSync(
      path.join(process.cwd(), "src/components/note-dialogs-panel.tsx"),
      "utf8"
    );
    const backupDialogs = fs.readFileSync(path.join(process.cwd(), "src/components/backup-dialogs.tsx"), "utf8");
    const settingsDialog = fs.readFileSync(path.join(process.cwd(), "src/components/settings-dialog.tsx"), "utf8");
    const apiKeyDialog = fs.readFileSync(path.join(process.cwd(), "src/components/api-key-dialog.tsx"), "utf8");
    const noteDeleteDialog = fs.readFileSync(path.join(process.cwd(), "src/components/note-delete-dialog.tsx"), "utf8");

    expect(noteShell).toContain('from "./use-note-workspace"');
    expect(noteShell).toContain('from "./note-shell-view"');
    expect(noteShell).toContain("const workspace = useNoteWorkspace()");
    expect(noteShell).not.toContain("async function loadNotes");
    expect(noteShell).not.toContain("async function openBackupDialog");
    expect(noteShellView).toContain('from "./note-sidebar"');
    expect(noteShellView).toContain('from "./note-editor-pane"');
    expect(noteShellView).toContain('from "./note-preview-pane"');
    expect(noteShellView).toContain('from "./note-dialogs-panel"');
    expect(noteDeleteDialog).toContain('from "./note-shell-dialogs"');
    expect(noteSidebar).toContain('from "./workspace-toolbar"');
    expect(workspaceToolbar).toContain("export function WorkspaceToolbar");
    expect(noteSidebar).toContain("export function NoteSidebar");
    expect(noteEditorPane).toContain("export function NoteEditorPane");
    expect(notePreviewPane).toContain("export function NotePreviewPane");
    expect(noteDialogsPanel).toContain("export function NoteDialogsPanel");
    expect(noteDialogsPanel).toContain("BackupDialogs");
    expect(noteDialogsPanel).toContain("SettingsDialog");
    expect(noteDialogsPanel).toContain("ApiKeyDialog");
    expect(noteDialogsPanel).toContain("NoteDeleteDialog");
    expect(noteDialogsPanel).not.toContain("role=\"dialog\"");
    expect(backupDialogs).toContain("export function BackupDialogs");
    expect(settingsDialog).toContain("export function SettingsDialog");
    expect(apiKeyDialog).toContain("export function ApiKeyDialog");
    expect(noteDeleteDialog).toContain("export function NoteDeleteDialog");
    expect(noteShellView).not.toContain("backupDialogOpen");
    expect(noteShellView).not.toContain("apiKeyDialogOpen");
    expect(workspaceHook).toContain('from "./note-workspace-model"');
    expect(workspaceHook).toContain('from "./use-backup-manager"');
    expect(workspaceHook).toContain('from "./use-api-key-manager"');
    expect(workspaceHook).toContain('from "./use-editor-actions"');
    expect(workspaceHook).toContain('from "./use-note-autosave"');
    expect(workspaceHook).toContain('from "./use-note-collection"');
    expect(workspaceHook).not.toMatch(/\btype ImportPreview\s*=/);
    expect(workspaceHook).not.toContain("window.setTimeout(async () =>");
    expect(workspaceHook).not.toMatch(/\basync function loadNotes\b/);
    expect(workspaceHook).not.toMatch(/\basync function createNewNote\b/);
    expect(workspaceHook).not.toMatch(/\basync function runBulkNoteAction\b/);
    expect(workspaceHook).not.toMatch(/\basync function openBackupDialog\b/);
    expect(workspaceHook).not.toMatch(/\basync function loadBackups\b/);
    expect(workspaceHook).not.toMatch(/\basync function createBackupArchive\b/);
    expect(workspaceHook).not.toMatch(/\basync function openApiKeyDialog\b/);
    expect(workspaceHook).not.toMatch(/\basync function loadApiKeys\b/);
    expect(workspaceHook).not.toMatch(/\basync function createApiKey\b/);
    expect(workspaceHook).not.toMatch(/\bfunction insertSnippet\b/);
    expect(workspaceHook).not.toMatch(/\bfunction insertCodeBlock\b/);
    expect(workspaceHook).not.toMatch(/\basync function uploadAttachment\b/);
    expect(workspaceModel).toContain("export type ImportPreview");
    expect(workspaceModel).toContain("export function normalizeNote");
    expect(workspaceModel).toContain("export function withoutSecret");
    expect(workspaceModel).toContain("export function summarizeBackupList");
    expect(backupManagerHook).toContain("export function useBackupManager");
    expect(backupManagerHook).toContain("async function openBackupDialog");
    expect(backupManagerHook).toContain("async function createBackupArchive");
    expect(apiKeyManagerHook).toContain("export function useApiKeyManager");
    expect(apiKeyManagerHook).toContain("async function openApiKeyDialog");
    expect(apiKeyManagerHook).toContain("async function createApiKey");
    expect(editorActionsHook).toContain("export function useEditorActions");
    expect(editorActionsHook).toContain("function insertSnippet");
    expect(editorActionsHook).toContain("function insertCodeBlock");
    expect(noteAutosaveHook).toContain("export function useNoteAutosave");
    expect(noteAutosaveHook).toContain("window.setTimeout(async () =>");
    expect(noteCollectionHook).toContain("export function useNoteCollection");
    expect(noteCollectionHook).toContain("async function loadNotes");
    expect(noteCollectionHook).toContain("async function runBulkNoteAction");
  });
});
