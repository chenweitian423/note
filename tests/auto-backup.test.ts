import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAutoBackupStatus } from "../src/lib/auto-backup";

const originalInterval = process.env.AUTO_BACKUP_INTERVAL_HOURS;
const originalRetention = process.env.BACKUP_RETENTION;

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-auto-backup-"));
}

afterEach(() => {
  process.env.AUTO_BACKUP_INTERVAL_HOURS = originalInterval;
  process.env.BACKUP_RETENTION = originalRetention;
});

describe("auto backup status", () => {
  it("reports disabled auto backup settings", () => {
    delete process.env.AUTO_BACKUP_INTERVAL_HOURS;
    process.env.BACKUP_RETENTION = "12";

    expect(getAutoBackupStatus(tempDir())).toEqual({
      enabled: false,
      intervalHours: 0,
      retention: 12,
      running: false,
      latestBackupCreatedAt: null,
      lastRunAt: null,
      lastError: null
    });
  });

  it("reports enabled auto backup settings and latest backup time", () => {
    const exportsDir = tempDir();
    const backupPath = path.join(exportsDir, "online-notepad-backup-2026-06-07T01-00-00-000Z.zip");
    process.env.AUTO_BACKUP_INTERVAL_HOURS = "6";
    process.env.BACKUP_RETENTION = "3";
    fs.writeFileSync(backupPath, "zip");
    const createdAt = fs.statSync(backupPath).mtime.toISOString();

    expect(getAutoBackupStatus(exportsDir)).toEqual({
      enabled: true,
      intervalHours: 6,
      retention: 3,
      running: false,
      latestBackupCreatedAt: createdAt,
      lastRunAt: null,
      lastError: null
    });
  });
});
