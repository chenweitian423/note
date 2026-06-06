import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import { getHealthStatus } from "@/lib/health";
import { getDataDir, getExportsDir, getUploadsDir } from "@/lib/paths";

export async function GET() {
  const status = getHealthStatus({
    dataDir: getDataDir(),
    uploadsDir: getUploadsDir(),
    exportsDir: getExportsDir(),
    version: packageJson.version
  });
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
