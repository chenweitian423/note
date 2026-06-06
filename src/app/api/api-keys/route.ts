import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { getDb, persistDb } from "@/lib/db";
import { requireWebSession } from "@/lib/require-session";

const schema = z.object({
  name: z.string().min(1).max(80)
});

export async function GET() {
  const unauthorized = await requireWebSession();
  if (unauthorized) return unauthorized;

  const db = await getDb();
  const apiKeys = listApiKeys(db);
  persistDb(db);
  return NextResponse.json({ apiKeys });
}

export async function POST(request: Request) {
  const unauthorized = await requireWebSession(request);
  if (unauthorized) return unauthorized;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const db = await getDb();
  const apiKey = createApiKey(db, { name: parsed.data.name });
  persistDb(db);
  return NextResponse.json({ apiKey }, { status: 201 });
}
