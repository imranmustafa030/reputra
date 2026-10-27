import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession } from "./session";
import { User } from "@/models/User";
import { Business } from "@/models/Business";

// The data access layer: every dashboard read starts here, so the session is
// checked next to the data, not only in proxy.ts. `cache` dedupes it per request.

export const getCurrentUser = cache(async () => {
  const { userId } = await getSession();
  if (!userId) return null;
  await db();
  const user = await User.findById(userId).lean();
  return user ? { id: String(user._id), name: user.name, email: user.email } : null;
});

export const requireOwner = cache(async () => {
  const user = await getCurrentUser();
  // /logout clears a stale cookie, so proxy.ts doesn't bounce the visitor back here.
  if (!user) redirect("/logout");
  const business = await Business.findOne({ owner: user.id }).lean();
  if (!business) redirect("/logout");
  return {
    user,
    business: {
      id: String(business._id),
      name: business.name,
      slug: business.slug,
      googleReviewUrl: business.googleReviewUrl,
      whatsappMessage: business.whatsappMessage,
    },
  };
});
