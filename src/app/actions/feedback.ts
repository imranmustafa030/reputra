"use server";

import { z } from "zod";
import { resolveEntry } from "@/lib/public";
import { Event, toSource } from "@/models/Event";
import { Feedback } from "@/models/Feedback";
import { keep, type FormState } from "@/lib/form-state";

const feedbackSchema = z.object({
  slug: z.string().trim().min(1),
  message: z.string().trim().min(3, "Write a few words for the owner.").max(2000, "Please keep it under 2000 characters."),
  name: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  source: z.string().optional(),
  website: z.string().optional(), // honeypot: people never see this field, bots fill it
});

// Public: anyone on a review page can send the owner a private note.
export async function sendFeedback(_: FormState, form: FormData): Promise<FormState> {
  const parsed = feedbackSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(form, "message", "name", "phone") };
  const { slug, message, name, phone, website } = parsed.data;
  if (website) return { ok: "Thank you." };

  const entry = await resolveEntry(slug); // the item's code, or an old slug
  if (!entry) return { error: "This review page no longer exists." };

  const source = toSource(parsed.data.source);
  await Feedback.create({ business: entry.business._id, message, name, phone, source });
  await Event.create({ business: entry.business._id, tag: entry.tag, type: "feedback", source });
  return { ok: "Thank you. Your message went straight to the owner." };
}
