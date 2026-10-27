"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { businessTag } from "@/lib/public";
import { Business } from "@/models/Business";
import { Event } from "@/models/Event";
import { keep, type FormState } from "@/lib/form-state";

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name."),
  googleReviewUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|goo\.gl|g\.co)\//.test(v), {
      message: "Paste the review link from Google (it starts with https://g.page/ or https://search.google.com/).",
    }),
  whatsappMessage: z
    .string()
    .trim()
    .min(10, "The WhatsApp message is too short.")
    .refine((v) => v.includes("{link}"), { message: "Keep {link} in the WhatsApp message, so the customer gets the review page." }),
});

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const { business } = await requireOwner();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(form, "name", "googleReviewUrl", "whatsappMessage") };

  await Business.updateOne({ _id: business.id }, parsed.data);
  updateTag(businessTag(business.slug)); // the public review page shows the new name and link straight away
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved.", values: parsed.data };
}

// Called when the receptionist opens WhatsApp from the sender page.
export async function logWhatsAppSent() {
  const { business } = await requireOwner();
  await Event.create({ business: business.id, type: "whatsapp_sent", source: "wa" });
}
