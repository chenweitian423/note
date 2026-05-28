import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRequiredEnv, readSessionToken, SESSION_COOKIE } from "./auth";

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await readSessionToken(token, getRequiredEnv("AUTH_SECRET"));
  return result.ok;
}

export async function requireSession(): Promise<NextResponse | null> {
  return (await hasSession()) ? null : NextResponse.json({ error: "未登录或会话已失效" }, { status: 401 });
}
