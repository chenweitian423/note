import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, getAppPassword, getAuthSecret, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { clearLoginFailures, isLoginRateLimited, recordLoginFailure } from "@/lib/rate-limit";

const schema = z.object({
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const rateLimitKey = "login";
  if (isLoginRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "登录尝试过多，请稍后再试" }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const ok = await verifyPassword(parsed.data.password, getAppPassword());
  if (!ok) {
    recordLoginFailure(rateLimitKey);
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  clearLoginFailures(rateLimitKey);
  const token = await createSessionToken(getAuthSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SECURE_COOKIES === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return NextResponse.json({ authenticated: true });
}
