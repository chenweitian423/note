import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNoteByNumber } from "@/lib/notes";
import { requireSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ noteNumber: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const unauthorized = await requireSession(request);
  if (unauthorized) return unauthorized;

  const { noteNumber } = await params;
  const note = getNoteByNumber(await getDb(), noteNumber);
  return note ? NextResponse.json({ note }) : NextResponse.json({ error: "笔记不存在" }, { status: 404 });
}
