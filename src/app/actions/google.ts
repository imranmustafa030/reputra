"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePaidOwner } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { businessTag } from "@/lib/public";
import {
  clearGoogleCookie,
  GoogleApiError,
  ownedLocation,
  placeDetails,
  PLACES_DAILY_CAP,
  readGoogleCookie,
  searchEnabled,
  writeReviewUrl,
  type GooglePlace,
} from "@/lib/google";
import { Business } from "@/models/Business";

export type ConnectResult = { ok: true; place: GooglePlace; url: string } | { ok: false; error: string };

async function connect(businessId: string, slug: string, place: GooglePlace, url: string) {
  await Business.updateOne({ _id: businessId }, { googlePlace: place, googleReviewUrl: url });
  updateTag(businessTag(slug)); // the review page's button works straight away
  revalidatePath("/dashboard", "layout");
}

// The owner picked their business from Google's list in Settings. `name` is the suggestion's own text.
export async function connectFoundPlace(placeId: string, name: string, sessionToken: string): Promise<ConnectResult> {
  const { business } = await requirePaidOwner();
  if (!searchEnabled()) return { ok: false, error: "Searching Google isn’t switched on yet. Paste your link instead." };
  if (!(await allow(`place:${business.id}`, 30, 60 * 10))) return { ok: false, error: "Too many tries. Wait a few minutes, then try again." };
  if (!(await allow("place:all-day", PLACES_DAILY_CAP, 60 * 60 * 24))) return { ok: false, error: "Google search is busy today. Paste your link instead." };

  const found = await placeDetails(String(placeId), String(sessionToken)).catch(() => null);
  if (!found) return { ok: false, error: "Google couldn’t find that business. Search again, or paste your link instead." };

  const place: GooglePlace = { ...found, name: String(name).trim().slice(0, 120), via: "search" };
  const url = writeReviewUrl(found.id);
  await connect(business.id, business.slug, place, url);
  return { ok: true, place, url };
}

// The owner signed in with Google and picked one of the businesses they manage.
export async function connectOwnedLocation(form: FormData) {
  const { business } = await requirePaidOwner();
  const { token } = await readGoogleCookie();
  if (!token) redirect("/dashboard/settings/google?error=expired");

  let location;
  try {
    location = await ownedLocation(token, String(form.get("location") ?? ""));
  } catch (e) {
    redirect(`/dashboard/settings/google?error=${e instanceof GoogleApiError ? e.kind : "failed"}`);
  }
  if (!location) redirect("/dashboard/settings/google?error=failed");

  await connect(business.id, business.slug, { id: location.placeId, name: location.title, address: location.address, via: "account" }, location.reviewUrl);
  await clearGoogleCookie(); // nothing from the owner's Google account is kept
  redirect("/dashboard/settings#google");
}

export async function disconnectGoogle() {
  const { business } = await requirePaidOwner();
  await Business.updateOne({ _id: business.id }, { googlePlace: null, googleReviewUrl: "" });
  updateTag(businessTag(business.slug));
  revalidatePath("/dashboard", "layout");
}
