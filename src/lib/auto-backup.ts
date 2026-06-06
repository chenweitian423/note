import { createBackup, getLatestBackup, readBackupRetention } from "./backup";
import { getDb } from "./db";
import { getExportsDir, getUploadsDir } from "./paths";

type BackupGlobal = typeof globalThis & {
  __onlineNotepadBackupRunning?: boolean;
  __onlineNotepadBackupTimer?: NodeJS.Timeout;
  __onlineNotepadBackupLastRunAt?: string;
  __onlineNotepadBackupLastError?: string | null;
};

export type AutoBackupStatus = {
  enabled: boolean;
  intervalHours: number;
  retention: number;
  running: boolean;
  latestBackupCreatedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

export function startAutoBackupScheduler(): void {
  const intervalHours = readAutoBackupIntervalHours();
  if (intervalHours <= 0) {
    return;
  }

  const globalState = globalThis as BackupGlobal;
  if (globalState.__onlineNotepadBackupTimer) {
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  const run = async () => {
    if (globalState.__onlineNotepadBackupRunning) {
      return;
    }
    globalState.__onlineNotepadBackupRunning = true;
    try {
      const db = await getDb();
      await createBackup(db, {
        uploadsDir: getUploadsDir(),
        exportsDir: getExportsDir(),
        retention: readBackupRetention()
      });
      globalState.__onlineNotepadBackupLastRunAt = new Date().toISOString();
      globalState.__onlineNotepadBackupLastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      globalState.__onlineNotepadBackupLastError = message;
      console.error("自动备份失败", error);
    } finally {
      globalState.__onlineNotepadBackupRunning = false;
    }
  };

  void run();
  globalState.__onlineNotepadBackupTimer = setInterval(run, intervalMs);
  globalState.__onlineNotepadBackupTimer.unref?.();
}

export function getAutoBackupStatus(exportsDir: string): AutoBackupStatus {
  const intervalHours = readAutoBackupIntervalHours();
  const globalState = globalThis as BackupGlobal;
  return {
    enabled: intervalHours > 0,
    intervalHours,
    retention: readBackupRetention(),
    running: Boolean(globalState.__onlineNotepadBackupRunning),
    latestBackupCreatedAt: getLatestBackup(exportsDir)?.createdAt ?? null,
    lastRunAt: globalState.__onlineNotepadBackupLastRunAt ?? null,
    lastError: globalState.__onlineNotepadBackupLastError ?? null
  };
}

function readAutoBackupIntervalHours(): number {
  const value = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
