import fs from "node:fs";
import { NextResponse } from "next/server";
import { getLatestBackup } from "@/lib/backup";
import { getExportsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const backup = getLatestBackup(getExportsDir());
  if (!backup) {
    return NextResponse.json({ error: "暂无备份" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fs.readFileSync(backup.path)), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${backup.filename}"`,
      "content-length": String(backup.size)
    }
  });
}
