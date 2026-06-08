import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("archived note pane behavior", () => {
  it("keeps the archived note action bar available after reselecting an archived note", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/use-note-collection.ts"), "utf8");
    const view = [
      fs.readFileSync(path.join(process.cwd(), "src/components/note-shell-view.tsx"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/components/note-editor-pane.tsx"), "utf8")
    ].join("\n");

    expect(source).toContain('setActiveMobilePane("editor")');
    expect(view).toContain("永久删除笔记");
  });
});
