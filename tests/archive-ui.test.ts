import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("archive and note deletion ui", () => {
  it("exposes an archive box with restore and permanent delete actions", () => {
    const source = [
      fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-sidebar.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-editor-pane.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-dialogs-panel.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/workspace-toolbar.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/use-note-workspace.ts"), "utf8")
    ].join("\n");

    expect(source).toContain("showArchived");
    expect(source).toContain("归档箱");
    expect(source).toContain('aria-label="恢复归档"');
    expect(source).toContain('aria-label="永久删除笔记"');
    expect(source).toContain("永久删除后不可恢复");
    expect(source).toContain("确认删除笔记");
    expect(source).toContain('params.set("archived", "true")');
    expect(source).toContain("/api/notes/bulk");
  });
  it("exposes multi-select bulk archive, restore, and permanent delete actions", () => {
    const source = [
      fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-sidebar.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-editor-pane.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/workspace-toolbar.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/use-note-workspace.ts"), "utf8")
    ].join("\n");

    expect(source).toContain("selectedNoteIds");
    expect(source).toContain('aria-label={`选择 ${note.title}`}');
    expect(source).toContain("/api/notes/bulk");
    expect(source).toContain('runBulkNoteAction("archive")');
    expect(source).toContain('runBulkNoteAction("restore")');
    expect(source).toContain('"delete"');
    expect(source).toContain("批量归档");
    expect(source).toContain("批量恢复");
    expect(source).toContain("批量永久删除");
  });
});
