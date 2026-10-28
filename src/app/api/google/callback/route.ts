import { NextResponse } from "next/server";
import { requirePaidOwner } from "@/lib/auth";
import { finishSignIn } from "@/lib/google";

// GET /api/google/callback: Google sends the owner back here; the picker lists their businesses.
export async function GET(request: Request) {
  await requirePaidOwner();
  const url = new URL(request.url);
  const picker = `${url.origin}/dashboard/settings/google`;
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${picker}?error=denied`, 303); // they pressed Cancel at Google

  try {
    const ok = await finishSignIn(url.origin, code, url.searchParams.get("state") ?? "");
    return NextResponse.redirect(ok ? picker : `${picker}?error=denied`, 303);
  } catch (e) {
    console.error(e); // Google didn't answer (network); the picker offers "Sign in again"
    return NextResponse.redirect(`${picker}?error=failed`, 303);
  }
}
