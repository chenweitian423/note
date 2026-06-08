import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("note shell structure", () => {
  it("keeps the page shell focused by delegating state and dialogs to extracted modules", () => {
    const noteShell = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");
    const noteShellView = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8");

    expect(noteShell).toContain('from "./use-note-workspace"');
    expect(noteShell).toContain('from "./note-shell-view"');
    expect(noteShell).toContain("const workspace = useNoteWorkspace()");
    expect(noteShell).not.toContain("async function loadNotes");
    expect(noteShell).not.toContain("async function openBackupDialog");
    expect(noteShellView).toContain('from "./note-shell-dialogs"');
  });
});
