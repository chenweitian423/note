import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { sanitizeFilename } from "@/lib/filenames";
import { getDb } from "@/lib/db";
import { getAttachment } from "@/lib/notes";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const attachment = getAttachment(await getDb(), id);
  if (!attachment) {
    return NextResponse.json({ error: "附件不存在" }, { status: 404 });
  }

  const uploadsDir = path.resolve(getUploadsDir());
  const filePath = path.resolve(uploadsDir, attachment.storedName);
  if (!filePath.startsWith(`${uploadsDir}${path.sep}`) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "附件文件不存在" }, { status: 404 });
  }

  const filename = sanitizeFilename(attachment.filename);
  return new NextResponse(new Uint8Array(fs.readFileSync(filePath)), {
    headers: {
      "content-type": attachment.mimeType || "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-length": String(attachment.size)
    }
  });
}
