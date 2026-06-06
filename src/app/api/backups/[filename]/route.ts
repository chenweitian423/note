import fs from "node:fs";
import { NextResponse } from "next/server";
import { getBackupByFilename } from "@/lib/backup";
import { getExportsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ filename: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { filename } = await params;
  const backup = getBackupByFilename(getExportsDir(), filename);
  if (!backup) {
    return NextResponse.json({ error: "备份不存在" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fs.readFileSync(backup.path)), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${backup.filename}"`,
      "content-length": String(backup.size)
    }
  });
}
