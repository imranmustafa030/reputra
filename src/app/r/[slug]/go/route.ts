import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Business } from "@/models/Business";
import { Event, toSource } from "@/models/Event";

// GET /r/<slug>/go: counts the tap on "Review us on Google", then sends the customer to Google.
export async function GET(request: Request, { params }: RouteContext<"/r/[slug]/go">) {
  const { slug } = await params;
  const url = new URL(request.url);

  await db();
  const business = await Business.findOne({ slug }).select("_id googleReviewUrl").lean();
  if (!business?.googleReviewUrl) return new NextResponse(null, { status: 303, headers: { Location: `/r/${slug}` } });

  await Event.create({ business: business._id, type: "google_click", source: toSource(url.searchParams.get("s")) });
  return NextResponse.redirect(business.googleReviewUrl, 303);
}
