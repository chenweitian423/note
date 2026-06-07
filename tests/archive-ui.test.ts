import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("archive and note deletion ui", () => {
  it("exposes an archive box with restore and permanent delete actions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).toContain("showArchived");
    expect(source).toContain("归档箱");
    expect(source).toContain('aria-label="恢复归档"');
    expect(source).toContain('aria-label="永久删除笔记"');
    expect(source).toContain("永久删除后不可恢复");
    expect(source).toContain("确认删除笔记");
    expect(source).toContain('params.set("archived", "true")');
    expect(source).toContain("permanent=true");
  });
});
