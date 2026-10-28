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
    // The Google listing the review link was made from, when the owner connected it instead of pasting a link.
    googlePlace: {
      type: new Schema(
        {
          id: { type: String, required: true },
          name: { type: String, default: "" },
          address: { type: String, default: "" },
          via: { type: String, enum: ["search", "account"], required: true }, // picked from Google's list, or from their Google account
        },
        { _id: false },
      ),
      default: null,
    },
    whatsappMessage: { type: String, default: DEFAULT_WHATSAPP_MESSAGE, maxlength: 600 },
    // A sentence or two from the owner about the business. The review page builds its "what stood
    // out?" picks from it, and the AI that drafts reviews uses it for context.
    description: { type: String, default: "", trim: true, maxlength: 400 },
    // Those picks, made from the description when it's saved, in each language of the review page.
    reviewChips: {
      type: { _id: false, en: [String], roman: [String], ur: [String] },
      default: null,
    },
    // The review page's short opening animation; the owner can turn it off in Settings.
    introAnimation: { type: Boolean, default: true },
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
