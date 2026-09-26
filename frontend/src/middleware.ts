import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side auth gate for `/admin/*`.
 *
 * The client-side gate in `app/admin/layout.tsx` only runs after the admin
 * bundle has been served, so it cannot stop a caller from requesting admin
 * pages/server components directly. This middleware rejects unauthenticated
 * requests before any admin route is rendered.
 *
 * The auth cookie is treated as the session indicator here; the client gate
 * remains in place for UX (redirect to `/access-denied`).
 */
const AUTH_COOKIE_NAMES = ["token", "auth_token", "access_token", "session"];

function hasAuthCookie(request: NextRequest): boolean {
  return AUTH_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return typeof value === "string" && value.length > 0;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!hasAuthCookie(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/access-denied";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
