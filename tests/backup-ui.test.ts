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

  it("keeps modal action buttons readable in narrow dialogs", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("white-space: nowrap");
    expect(css).toContain("width: auto");
    expect(css).toContain(".settings-actions .text-action");
    expect(css).toContain(".api-key-actions .text-action");
  });

  it("uses an in-app delete confirmation instead of the browser confirm dialog", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).not.toContain("window.confirm");
    expect(source).toContain("backupDeleteTarget");
    expect(source).toContain('aria-label="确认删除备份"');
    expect(source).toContain("确认删除");
    expect(source).toContain("取消");
  });

  it("shows backup statistics in the backup manager", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).toContain("backupSummary");
    expect(source).toContain("备份总数");
    expect(source).toContain("总占用空间");
    expect(source).toContain("保留策略");
    expect(source).toContain("最早备份");
    expect(source).toContain("最新备份");
  });

  it("shows auto backup status in the backup manager", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).toContain("autoBackup");
    expect(source).toContain("自动备份");
    expect(source).toContain("备份间隔");
    expect(source).toContain("最近自动备份");
    expect(source).toContain("最近失败");
  });
});
