import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { Business } from "@/models/Business";

export const businessTag = (slug: string) => `business:${slug}`;

// The review page is the hot path (every scan and tap lands here, often on slow 4G),
// so its business lookup is cached. saveSettings() refreshes it with updateTag().
export async function getPublicBusiness(slug: string) {
  "use cache";
  cacheTag(businessTag(slug));
  cacheLife("hours");

  await db();
  const business = await Business.findOne({ slug: slug.toLowerCase() }).select("name slug googleReviewUrl status").lean();
  // A suspended business's page reads as not found, the same as a missing one.
  if (!business || business.status === "suspended") return null;
  return { name: business.name, slug: business.slug, hasGoogleLink: Boolean(business.googleReviewUrl) };
}
