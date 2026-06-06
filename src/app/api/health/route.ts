import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import { getAutoBackupStatus } from "@/lib/auto-backup";
import { getHealthStatus } from "@/lib/health";
import { getDataDir, getExportsDir, getUploadsDir } from "@/lib/paths";

export async function GET() {
  const exportsDir = getExportsDir();
  const status = getHealthStatus({
    dataDir: getDataDir(),
    uploadsDir: getUploadsDir(),
    exportsDir,
    version: packageJson.version,
    autoBackup: getAutoBackupStatus(exportsDir)
  });
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
