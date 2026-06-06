import fs from "node:fs";
import path from "node:path";
import type { AutoBackupStatus } from "./auto-backup";

export type HealthStatus = {
  ok: boolean;
  version: string;
  checkedAt: string;
  checks: {
    dataDirWritable: boolean;
    uploadsDirWritable: boolean;
    exportsDirWritable: boolean;
  };
  autoBackup: AutoBackupStatus;
};

export function getHealthStatus(input: {
  dataDir: string;
  uploadsDir: string;
  exportsDir: string;
  version: string;
  autoBackup: AutoBackupStatus;
}): HealthStatus {
  const checks = {
    dataDirWritable: canWrite(input.dataDir),
    uploadsDirWritable: canWrite(input.uploadsDir),
    exportsDirWritable: canWrite(input.exportsDir)
  };
  return {
    ok: Object.values(checks).every(Boolean),
    version: input.version,
    checkedAt: new Date().toISOString(),
    checks,
    autoBackup: input.autoBackup
  };
}

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `.health-${process.pid}-${Date.now()}`);
    fs.writeFileSync(filePath, "ok");
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}
