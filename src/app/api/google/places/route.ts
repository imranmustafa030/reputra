import { NextResponse } from "next/server";
import { requirePaidOwner } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { PLACES_DAILY_CAP, searchEnabled, suggestPlaces } from "@/lib/google";

// GET /api/google/places?q=…&t=…: Google's suggestions while the owner types their business name
// in Settings. The Maps key stays on the server.
export async function GET(request: Request) {
  const { business } = await requirePaidOwner();
  if (!searchEnabled()) return NextResponse.json({ error: "off" }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const token = (params.get("t") ?? "").slice(0, 64);
  if (q.length < 2 || !token) return NextResponse.json({ suggestions: [] });
  if (!(await allow(`places:${business.id}`, 120, 60 * 10))) return NextResponse.json({ error: "slow" }, { status: 429 });
  if (!(await allow("places:all-day", PLACES_DAILY_CAP, 60 * 60 * 24))) return NextResponse.json({ error: "cap" }, { status: 503 });

  try {
    return NextResponse.json({ suggestions: await suggestPlaces(q, token) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
