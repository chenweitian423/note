import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getHealthStatus } from "../src/lib/health";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-health-"));
}

describe("health status", () => {
  it("reports writable data directories and app version", () => {
    const dataDir = tempDir();
    const uploadsDir = path.join(dataDir, "uploads");
    const exportsDir = path.join(dataDir, "exports");
    fs.mkdirSync(uploadsDir);
    fs.mkdirSync(exportsDir);

    const status = getHealthStatus({
      dataDir,
      uploadsDir,
      exportsDir,
      version: "9.9.9",
      autoBackup: {
        enabled: false,
        intervalHours: 0,
        retention: 10,
        running: false,
        latestBackupCreatedAt: null,
        lastRunAt: null,
        lastError: null
      }
    });

    expect(status.ok).toBe(true);
    expect(status.version).toBe("9.9.9");
    expect(status.checks.dataDirWritable).toBe(true);
    expect(status.checks.uploadsDirWritable).toBe(true);
    expect(status.checks.exportsDirWritable).toBe(true);
    expect(status.autoBackup.enabled).toBe(false);
  });
});
