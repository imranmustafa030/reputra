"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireOwner, requirePaidOwner } from "@/lib/auth";
import { businessTag } from "@/lib/public";
import { Business, CATEGORIES } from "@/models/Business";
import { Event } from "@/models/Event";
import { Feedback } from "@/models/Feedback";
import { keep, type FormState } from "@/lib/form-state";

const GOOGLE_LINK = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|goo\.gl|g\.co)\//;

const DESCRIPTION = z.string().trim().max(400, "Keep the description under 400 characters.").default("");

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(80),
  category: z.enum(CATEGORIES).catch("other"),
  city: z.string().trim().min(2, "Enter the city.").max(60),
  googleReviewUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || GOOGLE_LINK.test(v), {
      message: "Paste the review link from Google (it starts with https://g.page/ or https://search.google.com/).",
    }),
  whatsappMessage: z
    .string()
    .trim()
    .min(10, "The WhatsApp message is too short.")
    .max(600, "Keep the WhatsApp message under 600 characters.")
    .refine((v) => v.includes("{link}"), { message: "Keep {link} in the WhatsApp message, so the customer gets the review page." }),
  description: DESCRIPTION,
  introAnimation: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const { business } = await requirePaidOwner();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      values: { ...keep(form, "name", "category", "city", "googleReviewUrl", "whatsappMessage", "description"), introAnimation: form.get("introAnimation") === "on" ? "on" : "off" },
    };
  }

  // A link typed over a connected place replaces it; the same link sent back keeps the connection.
  const linkChanged = parsed.data.googleReviewUrl !== business.googleReviewUrl;
  await Business.updateOne({ _id: business.id }, { ...parsed.data, ...(linkChanged ? { googlePlace: null } : {}) });
  updateTag(businessTag(business.slug)); // the public review page shows the new name and link straight away
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved.", values: { ...parsed.data, introAnimation: parsed.data.introAnimation ? "on" : "off" } };
}

// Right after the first payment: a line or two about the business, which the review page's AI
// reads when it makes the picks customers tap. Skippable; Settings has it too.
export async function saveDescription(_: FormState, form: FormData): Promise<FormState> {
  const { business } = await requireOwner();
  const parsed = DESCRIPTION.safeParse(form.get("description") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(form, "description") };
  if (!parsed.data) return { error: "Write a line or two about your business, or skip this for now.", values: keep(form, "description") };
  await Business.updateOne({ _id: business.id }, { description: parsed.data });
  return { ok: "Saved. You can change it any time in Settings.", values: { description: parsed.data } };
}

// Called when the owner opens WhatsApp from the sender. Only the count is kept, never the number.
export async function logWhatsAppSent() {
  const { business } = await requirePaidOwner();
  await Event.create({ business: business.id, type: "whatsapp_sent", source: "wa" });
}

// Opening the notes page marks every note as seen, so the "new" count in the nav clears.
export async function markNotesSeen() {
  const { business } = await requirePaidOwner();
  const { modifiedCount } = await Feedback.updateMany({ business: business.id, read: false }, { $set: { read: true } });
  if (modifiedCount) revalidatePath("/dashboard", "layout");
}
