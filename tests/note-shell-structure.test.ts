import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("note shell structure", () => {
  it("keeps the page shell focused by delegating state and dialogs to extracted modules", () => {
    const noteShell = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");
    const noteShellView = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8");
    const workspaceHook = fs.readFileSync(path.join(process.cwd(), "src/components/use-note-workspace.ts"), "utf8");
    const workspaceModel = fs.readFileSync(path.join(process.cwd(), "src/components/note-workspace-model.ts"), "utf8");
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

    expect(noteShell).toContain('from "./use-note-workspace"');
    expect(noteShell).toContain('from "./note-shell-view"');
    expect(noteShell).toContain("const workspace = useNoteWorkspace()");
    expect(noteShell).not.toContain("async function loadNotes");
    expect(noteShell).not.toContain("async function openBackupDialog");
    expect(noteShellView).toContain('from "./note-sidebar"');
    expect(noteShellView).toContain('from "./note-editor-pane"');
    expect(noteShellView).toContain('from "./note-preview-pane"');
    expect(noteShellView).toContain('from "./note-dialogs-panel"');
    expect(noteDialogsPanel).toContain('from "./note-shell-dialogs"');
    expect(noteSidebar).toContain('from "./workspace-toolbar"');
    expect(workspaceToolbar).toContain("export function WorkspaceToolbar");
    expect(noteSidebar).toContain("export function NoteSidebar");
    expect(noteEditorPane).toContain("export function NoteEditorPane");
    expect(notePreviewPane).toContain("export function NotePreviewPane");
    expect(noteDialogsPanel).toContain("export function NoteDialogsPanel");
    expect(noteShellView).not.toContain("backupDialogOpen");
    expect(noteShellView).not.toContain("apiKeyDialogOpen");
    expect(workspaceHook).toContain('from "./note-workspace-model"');
    expect(workspaceHook).not.toMatch(/\btype ImportPreview\s*=/);
    expect(workspaceModel).toContain("export type ImportPreview");
    expect(workspaceModel).toContain("export function normalizeNote");
    expect(workspaceModel).toContain("export function withoutSecret");
    expect(workspaceModel).toContain("export function summarizeBackupList");
  });
});
