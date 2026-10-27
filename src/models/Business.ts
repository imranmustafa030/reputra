import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Placeholders the WhatsApp sender fills in: {name}, {business}, {link}.
export const DEFAULT_WHATSAPP_MESSAGE =
  "Assalam o Alaikum {name}! Shukriya {business} visit karne ka. Agar aap ko hamari service achi lagi, to please 30 seconds mein Google pe review dein: {link}";

export const CATEGORIES = ["restaurant", "cafe", "salon", "clinic", "gym", "shop", "hotel", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

const businessSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // one business per owner
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // The public review page lives at /r/<slug>; it is printed on stands and cards, so it never changes on its own.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "other" },
    city: { type: String, default: "Lahore", trim: true, maxlength: 60 },
    googleReviewUrl: { type: String, default: "", trim: true },
    whatsappMessage: { type: String, default: DEFAULT_WHATSAPP_MESSAGE, maxlength: 600 },
    // Suspended by the Reputra team: the dashboard locks and the review page stops working.
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    adminNote: { type: String, default: "", maxlength: 2000 }, // internal, never shown to the owner
    demo: { type: Boolean, default: false }, // sample account: labelled as such and left out of company totals
  },
  { timestamps: true },
);
businessSchema.index({ createdAt: -1 });

export type BusinessDoc = InferSchemaType<typeof businessSchema>;
export const Business: Model<BusinessDoc> = models.Business ?? model("Business", businessSchema);
