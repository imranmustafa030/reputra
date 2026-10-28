import { NextResponse } from "next/server";
import { requirePaidOwner } from "@/lib/auth";
import { accountEnabled, signInUrl } from "@/lib/google";

// GET /api/google/connect: sends the owner to Google to sign in, from "Sign in with Google" in Settings.
export async function GET(request: Request) {
  await requirePaidOwner();
  const origin = new URL(request.url).origin;
  if (!accountEnabled()) return NextResponse.redirect(`${origin}/dashboard/settings#google`, 303);
  return NextResponse.redirect(await signInUrl(origin), 303);
}
