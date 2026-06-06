import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("backup manager ui", () => {
  it("exposes a backup zip restore upload entry", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/note-shell.tsx"), "utf8");

    expect(source).toContain('aria-label="导入备份 ZIP"');
    expect(source).toContain('accept=".zip,application/zip"');
  });
});
