import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyApiKey } from "./api-keys";
import { getAuthSecret, readSessionToken, SESSION_COOKIE } from "./auth";
import { getDb, persistDb } from "./db";

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await readSessionToken(token, getAuthSecret());
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
  if (!(await hasSession())) {
    return NextResponse.json({ error: "未登录或会话已失效" }, { status: 401 });
  }
  if (request && isStateChangingMethod(request.method) && !hasSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }
  return null;
}

export async function requireWebSession(request?: Request): Promise<NextResponse | null> {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "未登录或会话已失效" }, { status: 401 });
  }
  if (request && isStateChangingMethod(request.method) && !hasSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }
  return null;
}

function isStateChangingMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
