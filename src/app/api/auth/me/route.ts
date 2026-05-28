import { NextResponse } from "next/server";
import { hasSession } from "@/lib/require-session";

export async function GET() {
  if (!(await hasSession())) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
