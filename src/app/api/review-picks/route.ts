import { z } from "zod";
import { headers } from "next/headers";
import { resolveEntry } from "@/lib/public";
import { allow } from "@/lib/rate-limit";
import { makePicks } from "@/lib/review-ai";
import { Business } from "@/models/Business";

const Body = z.object({
  slug: z.string().min(1).max(64),
  rating: z.number().int().min(1).max(5),
  lang: z.enum(["en", "roman", "ur"]),
});

// POST /api/review-picks: the tap-to-pick words for this business, in the customer's language,
// with "could be better" ones for 1 to 3 stars. `slug` is the item's code. Made by AI on the spot
// (kept half an hour per business and language); a few per visitor every 10 minutes, past that
// the general ones.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { slug, rating, lang } = parsed.data;

  const entry = await resolveEntry(slug);
  if (!entry) return Response.json({ error: "not found" }, { status: 404 });
  const business = await Business.findById(entry.business._id).select("name category description").lean();
  if (!business) return Response.json({ error: "not found" }, { status: 404 });

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const useAi = await allow(`picks:${ip}:${String(entry.business._id)}`, 20, 600);

  const { picks, ai } = await makePicks({
    id: String(entry.business._id),
    name: business.name,
    category: business.category,
    description: useAi ? (business.description ?? "") : "",
    lang,
    low: rating <= 3,
  });
  return Response.json({ picks, ai }, { headers: { "Cache-Control": "no-store" } });
}
