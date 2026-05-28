import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, getRequiredEnv, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const ok = await verifyPassword(parsed.data.password, getRequiredEnv("APP_PASSWORD"));
  if (!ok) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = await createSessionToken(getRequiredEnv("AUTH_SECRET"));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SECURE_COOKIES === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return NextResponse.json({ authenticated: true });
}
