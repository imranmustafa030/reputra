import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// POST from the dashboard's "Log out" button; GET when the dashboard finds a stale session.
// A relative Location keeps the visitor on whatever host they came in on.
function logout() {
  const response = new NextResponse(null, { status: 303, headers: { Location: "/login" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export { logout as GET, logout as POST };
