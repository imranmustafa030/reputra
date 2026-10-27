import { db } from "@/lib/db";
import { Business } from "@/models/Business";
import { Event, toSource } from "@/models/Event";

// POST /api/events: the review page reports, from a real browser (so link previews and bots
// stay out of the numbers), either a visit { slug, source } or the stars the customer tapped
// { slug, source, type: "rating", value: 1–5 }.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!slug) return new Response(null, { status: 400 });
  const isRating = body.type === "rating";
  const value = Number(body.value);
  if (isRating && !(Number.isInteger(value) && value >= 1 && value <= 5)) return new Response(null, { status: 400 });

  await db();
  const business = await Business.findOne({ slug, status: "active" }).select("_id").lean();
  if (!business) return new Response(null, { status: 404 });

  await Event.create({
    business: business._id,
    type: isRating ? "rating" : "visit",
    source: toSource(body.source),
    ...(isRating ? { value } : {}),
  });
  return new Response(null, { status: 204 });
}
