import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login", "/manifest.webmanifest"];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png"
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("flota_session")?.value;
  if (!session || session !== process.env.APP_PASSCODE) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
