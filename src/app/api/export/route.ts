import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { exportArchive } from "@/lib/export";
import { getUploadsDir } from "@/lib/paths";
import { requireSession } from "@/lib/require-session";

export async function GET(request: Request) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const zip = await exportArchive(await getDb(), getUploadsDir());
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="online-notepad-${Date.now()}.zip"`
    }
  });
}
