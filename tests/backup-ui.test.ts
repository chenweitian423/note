import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("backup manager ui", () => {
  it("exposes a backup zip restore upload entry", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).toContain('aria-label="导入备份 ZIP"');
    expect(source).toContain('accept=".zip,application/zip"');
  });

  it("exposes backup deletion and keeps the topbar focused", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");
    const topbar = source.match(/<div className="topbar">[\s\S]*?<\/div>/)?.[0] ?? "";

    expect(source).toContain("删除这份备份");
    expect(topbar).toContain('aria-label="新建笔记"');
    expect(topbar).toContain('aria-label="导出"');
    expect(topbar).toContain('aria-label="设置和状态"');
    expect(topbar).toContain('aria-label="退出登录"');
    expect(topbar).not.toContain('aria-label="备份管理"');
    expect(topbar).not.toContain('aria-label="API Key"');
    expect(topbar).not.toContain('aria-label="导入"');
  });
});
