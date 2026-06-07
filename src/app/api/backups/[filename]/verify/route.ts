import fs from "node:fs";
import { NextResponse } from "next/server";
import { getBackupByFilename } from "@/lib/backup";
import { inspectImportArchive } from "@/lib/import";
import { getExportsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ filename: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { filename } = await params;
  const backup = getBackupByFilename(getExportsDir(), filename);
  if (!backup) {
    return NextResponse.json({ error: "备份不存在" }, { status: 404 });
  }

  const preview = await inspectImportArchive(fs.readFileSync(backup.path));
  return NextResponse.json(preview, { status: preview.valid ? 200 : 400 });
}
