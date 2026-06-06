import { NextResponse } from "next/server";
import { createBackup, listBackups, readBackupRetention, summarizeBackups } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { getExportsDir, getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const retention = readBackupRetention();
  const backups = listBackups(getExportsDir());
  return NextResponse.json({ backups, summary: summarizeBackups(backups, retention) });
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
