export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoBackupScheduler } = await import("./lib/auto-backup");
    startAutoBackupScheduler();
  }
}
