import { NextResponse, type NextRequest } from "next/server";

// A fast, optimistic gate: no session cookie, no dashboard. The real check
// (is the cookie valid, does the user exist) happens next to the data in lib/auth.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("reputra_session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
