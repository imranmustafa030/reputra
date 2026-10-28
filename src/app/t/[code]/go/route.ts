import { NextResponse } from "next/server";
import { resolveEntry } from "@/lib/public";
import { Event, toSource } from "@/models/Event";

// GET /t/<code>/go: counts the tap on "Review us on Google", then sends the customer to Google.
export async function GET(request: Request, { params }: RouteContext<"/t/[code]/go">) {
  const { code } = await params;
  const url = new URL(request.url);
  const entry = await resolveEntry(code.toUpperCase());
  if (!entry?.business.googleReviewUrl) return new NextResponse(null, { status: 303, headers: { Location: `/t/${code}` } });

  await Event.create({ business: entry.business._id, tag: entry.tag, type: "google_click", source: toSource(url.searchParams.get("s")) });
  return NextResponse.redirect(entry.business.googleReviewUrl, 303);
}
