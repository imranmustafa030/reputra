import { z } from "zod";
import { headers } from "next/headers";
import { resolveEntry } from "@/lib/public";
import { allow } from "@/lib/rate-limit";
import { templateDrafts, writeDrafts } from "@/lib/review-ai";
import { Business } from "@/models/Business";

const Body = z.object({
  slug: z.string().min(1).max(64),
  rating: z.number().int().min(1).max(5),
  picks: z.array(z.string().trim().min(1).max(40)).max(3),
  issues: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
  note: z.string().trim().max(300).default(""),
  lang: z.enum(["en", "roman", "ur"]),
});

// POST /api/review-drafts: three versions of the customer's review (very short, short, a bit
// longer), written from what they tapped and typed. `slug` is the item's code. A few per visitor
// per item every 10 minutes, so nobody runs the free AI quota dry; past that, plain drafts.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { slug, rating, picks, issues, note, lang } = parsed.data;

  const entry = await resolveEntry(slug);
  if (!entry) return Response.json({ error: "not found" }, { status: 404 });
  const business = await Business.findById(entry.business._id).select("name category description").lean();
  if (!business) return Response.json({ error: "not found" }, { status: 404 });

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const useAi = await allow(`drafts:${ip}:${String(entry.business._id)}`, 12, 600);

  const input = { name: business.name, category: business.category, description: business.description ?? "", rating, picks, issues, note, lang };
  const { drafts, ai } = useAi ? await writeDrafts(input) : { drafts: templateDrafts(input), ai: false };
  return Response.json({ drafts, ai }, { headers: { "Cache-Control": "no-store" } });
}
