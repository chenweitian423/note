import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readComponentSources(files: string[]) {
  return files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
}

describe("archive and note deletion ui", () => {
  it("exposes an archive box with restore and permanent delete actions", () => {
    const source = readComponentSources([
      "src/components/note-shell-view.tsx",
      "src/components/note-sidebar.tsx",
      "src/components/note-editor-pane.tsx",
      "src/components/note-dialogs-panel.tsx",
      "src/components/note-delete-dialog.tsx",
      "src/components/workspace-toolbar.tsx",
      "src/components/use-note-workspace.ts",
      "src/components/use-note-collection.ts"
    ]);

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
    const source = readComponentSources([
      "src/components/note-shell-view.tsx",
      "src/components/note-sidebar.tsx",
      "src/components/note-editor-pane.tsx",
      "src/components/workspace-toolbar.tsx",
      "src/components/use-note-workspace.ts",
      "src/components/use-note-collection.ts"
    ]);

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
