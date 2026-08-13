import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/adminSession";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const passcode = body.passcode;

  if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, passcode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
