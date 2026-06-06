import fs from "node:fs";
import path from "node:path";
import type { Database } from "sql.js";
import { exportArchive } from "./export";

export type BackupInfo = {
  filename: string;
  path: string;
  size: number;
  createdAt: string;
};

const BACKUP_PREFIX = "online-notepad-backup-";
const BACKUP_SUFFIX = ".zip";

export function readBackupRetention(): number {
  const value = Number(process.env.BACKUP_RETENTION ?? 10);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
}

export async function createBackup(
  db: Database,
  input: {
    uploadsDir: string;
    exportsDir: string;
    retention?: number;
    now?: () => Date;
  }
): Promise<BackupInfo> {
  fs.mkdirSync(input.exportsDir, { recursive: true });
  const timestamp = (input.now ?? (() => new Date()))().toISOString().replace(/[:.]/g, "-");
  const filename = `${BACKUP_PREFIX}${timestamp}${BACKUP_SUFFIX}`;
  const filePath = path.join(input.exportsDir, filename);
  const zip = await exportArchive(db, input.uploadsDir);
  fs.writeFileSync(filePath, zip);
  pruneBackups(input.exportsDir, input.retention ?? readBackupRetention());
  return toBackupInfo(filePath);
}

export function listBackups(exportsDir: string): BackupInfo[] {
  if (!fs.existsSync(exportsDir)) {
    return [];
  }
  return fs
    .readdirSync(exportsDir)
    .filter((filename) => filename.startsWith(BACKUP_PREFIX) && filename.endsWith(BACKUP_SUFFIX))
    .map((filename) => toBackupInfo(path.join(exportsDir, filename)))
    .sort((left, right) => right.filename.localeCompare(left.filename));
}

export function getLatestBackup(exportsDir: string): BackupInfo | null {
  return listBackups(exportsDir)[0] ?? null;
}

function pruneBackups(exportsDir: string, retention: number): void {
  if (retention <= 0) {
    return;
  }
  for (const backup of listBackups(exportsDir).slice(retention)) {
    fs.unlinkSync(backup.path);
  }
}

function toBackupInfo(filePath: string): BackupInfo {
  const stat = fs.statSync(filePath);
  return {
    filename: path.basename(filePath),
    path: filePath,
    size: stat.size,
    createdAt: stat.mtime.toISOString()
  };
}
