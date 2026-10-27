import { db } from "@/lib/db";
import { Business } from "@/models/Business";
import { Event, toSource } from "@/models/Event";

// POST /api/events: the review page reports a visit once it has loaded in a real browser.
// (Counting from the browser, not the server render, keeps link previews and bots out of the numbers.)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!slug) return new Response(null, { status: 400 });

  await db();
  const business = await Business.findOne({ slug }).select("_id").lean();
  if (!business) return new Response(null, { status: 404 });

  await Event.create({ business: business._id, type: "visit", source: toSource(body.source) });
  return new Response(null, { status: 204 });
}
