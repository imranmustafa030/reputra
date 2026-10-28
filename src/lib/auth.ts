import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession } from "./session";
import { accessFrom, canUseDashboard } from "./billing";
import { User, type Role } from "@/models/User";
import { Business } from "@/models/Business";
import { Subscription } from "@/models/Subscription";

// The data access layer: every dashboard, checkout and admin read starts here, so the
// session is checked next to the data, not only in proxy.ts. `cache` dedupes it per request.

export const getCurrentUser = cache(async () => {
  const { userId, v } = await getSession();
  if (!userId) return null;
  await db();
  const user = await User.findById(userId).lean();
  if (!user || user.status !== "active" || user.sessionVersion !== (v ?? 0)) return null;
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone, role: user.role as Role };
});

// Where someone lands after logging in.
export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : "/dashboard";
}

// An owner and their business, paid or not. Checkout and billing use this one.
export const requireOwner = cache(async () => {
  const user = await getCurrentUser();
  // /logout clears a stale cookie, so proxy.ts doesn't bounce the visitor back here.
  if (!user) redirect("/logout");
  if (user.role === "admin") redirect("/admin");
  const business = await Business.findOne({ owner: user.id }).lean();
  if (!business) redirect("/logout");
  const subscription = await Subscription.findOne({ business: business._id }).lean();
  return {
    user,
    business: {
      id: String(business._id),
      name: business.name,
      slug: business.slug,
      category: business.category,
      city: business.city,
      googleReviewUrl: business.googleReviewUrl,
      whatsappMessage: business.whatsappMessage,
      introAnimation: business.introAnimation !== false,
      suspended: business.status === "suspended",
      demo: business.demo,
    },
    access: accessFrom(subscription),
  };
});

// Every dashboard page except Plan & billing: a paid, unsuspended plan.
export const requirePaidOwner = cache(async () => {
  const owner = await requireOwner();
  if (owner.access.state === "none") redirect("/checkout");
  if (owner.business.suspended || !canUseDashboard(owner.access)) redirect("/dashboard/billing");
  return owner;
});

export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/logout");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
});
