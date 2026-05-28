import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyApiKey } from "./api-keys";
import { getRequiredEnv, readSessionToken, SESSION_COOKIE } from "./auth";
import { getDb, persistDb } from "./db";

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await readSessionToken(token, getRequiredEnv("AUTH_SECRET"));
  return result.ok;
}

export async function hasApiKey(request: Request): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return false;
  }
  const db = await getDb();
  const ok = verifyApiKey(db, token);
  if (ok) {
    persistDb(db);
  }
  return ok;
}

export async function requireSession(request?: Request): Promise<NextResponse | null> {
  if (request && (await hasApiKey(request))) {
    return null;
  }
  return (await hasSession()) ? null : NextResponse.json({ error: "未登录或会话已失效" }, { status: 401 });
}

export async function requireWebSession(): Promise<NextResponse | null> {
  return (await hasSession()) ? null : NextResponse.json({ error: "未登录或会话已失效" }, { status: 401 });
}
