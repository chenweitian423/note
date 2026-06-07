import { NextResponse } from "next/server";
import { inspectImportArchive } from "@/lib/import";
import { DEFAULT_MAX_IMPORT_ZIP_BYTES, envNumber } from "@/lib/limits";
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

  const preview = await inspectImportArchive(Buffer.from(await file.arrayBuffer()));
  return NextResponse.json(preview, { status: preview.valid ? 200 : 400 });
}
