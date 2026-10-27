import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Placeholders the WhatsApp sender fills in: {name}, {business}, {link}.
export const DEFAULT_WHATSAPP_MESSAGE =
  "Assalam o Alaikum {name}! Shukriya {business} visit karne ka. Agar aap ko hamari service achi lagi, to please 30 seconds mein Google pe review dein: {link}";

const businessSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    // The public review page lives at /r/<slug>; it is printed on stands and cards, so it never changes on its own.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleReviewUrl: { type: String, default: "", trim: true },
    whatsappMessage: { type: String, default: DEFAULT_WHATSAPP_MESSAGE },
  },
  { timestamps: true },
);

export type BusinessDoc = InferSchemaType<typeof businessSchema>;
export const Business: Model<BusinessDoc> = models.Business ?? model("Business", businessSchema);
