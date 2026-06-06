import { NextResponse } from "next/server";
import { createBackup, listBackups, readBackupRetention } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { getExportsDir, getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ backups: listBackups(getExportsDir()) });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const backup = await createBackup(await getDb(), {
    uploadsDir: getUploadsDir(),
    exportsDir: getExportsDir(),
    retention: readBackupRetention()
  });
  return NextResponse.json({ backup }, { status: 201 });
}
