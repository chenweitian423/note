import { NextResponse } from "next/server";
import { createBackup, readBackupRetention } from "@/lib/backup";
import { getDb, persistDb } from "@/lib/db";
import { importArchive, inspectImportArchive } from "@/lib/import";
import { DEFAULT_MAX_IMPORT_ZIP_BYTES, envNumber } from "@/lib/limits";
import { getExportsDir, getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function POST(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 ZIP 文件" }, { status: 400 });
  }
  const maxBytes = envNumber("MAX_IMPORT_ZIP_MB", DEFAULT_MAX_IMPORT_ZIP_BYTES / 1024 / 1024) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "ZIP 文件过大" }, { status: 400 });
  }

  try {
    const zipBuffer = Buffer.from(await file.arrayBuffer());
    const preview = await inspectImportArchive(zipBuffer);
    if (!preview.valid) {
      return NextResponse.json({ error: preview.error }, { status: 400 });
    }

    const db = await getDb();
    const uploadsDir = getUploadsDir();
    const backup = await createBackup(db, {
      uploadsDir,
      exportsDir: getExportsDir(),
      retention: readBackupRetention()
    });
    const result = await importArchive(db, uploadsDir, zipBuffer);
    persistDb(db);
    return NextResponse.json({ ...result, backup });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 400 });
  }
}
