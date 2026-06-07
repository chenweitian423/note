import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("import api route", () => {
  it("creates a validated pre-import backup before writing imported notes", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/app/api/import/route.ts"), "utf8");

    expect(source).toContain("inspectImportArchive");
    expect(source).toContain("createBackup");
    expect(source).toContain("readBackupRetention");
    expect(source).toContain("getExportsDir");
    expect(source).toContain("backup");

    const validateIndex = source.indexOf("inspectImportArchive");
    const backupIndex = source.indexOf("createBackup", validateIndex);
    const importIndex = source.indexOf("importArchive", backupIndex);

    expect(validateIndex).toBeGreaterThanOrEqual(0);
    expect(backupIndex).toBeGreaterThan(validateIndex);
    expect(importIndex).toBeGreaterThan(backupIndex);
  });
});
