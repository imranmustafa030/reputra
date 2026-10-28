import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { Business } from "@/models/Business";
import { Tag, type TagKind } from "@/models/Tag";
import { isCode } from "./tags";

export const businessTag = (slug: string) => `business:${slug}`;

// The review page is the hot path (every scan and tap lands here, often on slow 4G),
// so its business lookup is cached. saveSettings() refreshes it with updateTag().
export async function getPublicBusiness(slug: string) {
  "use cache";
  cacheTag(businessTag(slug));
  cacheLife("hours");

  await db();
  const business = await Business.findOne({ slug: slug.toLowerCase() }).select("name slug googleReviewUrl status introAnimation").lean();
  // A suspended business's page reads as not found, the same as a missing one.
  if (!business || business.status === "suspended") return null;
  return { id: String(business._id), name: business.name, slug: business.slug, hasGoogleLink: Boolean(business.googleReviewUrl), intro: business.introAnimation !== false };
}

export const entryTag = (code: string) => `entry:${code}`;

// The review page behind a code (reputra.pk/t/K7X9Q2): which business, and which item or link
// it is. Cached like the slug lookup; switching an item off refreshes it with updateTag(entryTag()).
export async function getPublicEntry(code: string) {
  "use cache";
  cacheTag(entryTag(code));
  cacheLife("hours");

  await db();
  const tag = await Tag.findOne({ code }).select("business kind status").lean();
  if (!tag) return null;
  const business = await Business.findById(tag.business).select("name slug googleReviewUrl status introAnimation").lean();
  if (!business || business.status === "suspended") return null;
  cacheTag(businessTag(business.slug));
  return {
    code,
    kind: tag.kind as TagKind,
    off: tag.status === "off",
    business: { name: business.name, slug: business.slug, hasGoogleLink: Boolean(business.googleReviewUrl), intro: business.introAnimation !== false },
  };
}

// For writes (visits, Google taps, notes): a code or a slug, to the business and item behind it.
// Not cached, so a switched-off item or a suspended business stops counting at once.
export async function resolveEntry(key: string) {
  await db();
  if (isCode(key)) {
    const tag = await Tag.findOne({ code: key, status: "active" }).select("business kind").lean();
    if (!tag) return null;
    const business = await Business.findOne({ _id: tag.business, status: "active" }).select("_id googleReviewUrl").lean();
    return business ? { business, tag: tag._id, kind: tag.kind as TagKind } : null;
  }
  const business = await Business.findOne({ slug: key.toLowerCase(), status: "active" }).select("_id googleReviewUrl").lean();
  return business ? { business, tag: null, kind: null } : null;
}
