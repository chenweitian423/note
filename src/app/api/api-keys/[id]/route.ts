import { NextResponse } from "next/server";
import { deleteApiKey } from "@/lib/api-keys";
import { getDb, persistDb } from "@/lib/db";
import { requireWebSession } from "@/lib/require-session";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const unauthorized = await requireWebSession();
  if (unauthorized) return unauthorized;

  const db = await getDb();
  const { id } = await params;
  deleteApiKey(db, id);
  persistDb(db);
  return NextResponse.json({ ok: true });
}
