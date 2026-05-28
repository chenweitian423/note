import { NextResponse } from "next/server";
import { getDb, persistDb } from "@/lib/db";
import { importArchive } from "@/lib/import";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function POST(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 ZIP 文件" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await importArchive(db, getUploadsDir(), Buffer.from(await file.arrayBuffer()));
    persistDb(db);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 400 });
  }
}
