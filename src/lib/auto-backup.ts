import { createBackup, readBackupRetention } from "./backup";
import { getDb } from "./db";
import { getExportsDir, getUploadsDir } from "./paths";

type BackupGlobal = typeof globalThis & {
  __onlineNotepadBackupRunning?: boolean;
  __onlineNotepadBackupTimer?: NodeJS.Timeout;
};

export function startAutoBackupScheduler(): void {
  const intervalHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 0);
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
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
    } catch (error) {
      console.error("自动备份失败", error);
    } finally {
      globalState.__onlineNotepadBackupRunning = false;
    }
  };

  void run();
  globalState.__onlineNotepadBackupTimer = setInterval(run, intervalMs);
  globalState.__onlineNotepadBackupTimer.unref?.();
}
