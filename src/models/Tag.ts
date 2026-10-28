import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Every way into a review page has its own short code, e.g. reputra.pk/t/K7X9Q2:
// each printed item (stand, card, sticker) gets one, and each business has one for
// WhatsApp messages and one plain link. The code never shows the business name, scans are
// counted per item, and a lost or copied item can be switched off on its own.
export const TAG_KINDS = ["stand", "card", "sticker", "whatsapp", "link"] as const;
export type TagKind = (typeof TAG_KINDS)[number];
export const ITEM_KINDS = ["stand", "card", "sticker"] as const satisfies readonly TagKind[];

const tagSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // six characters, no look-alikes
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    kind: { type: String, enum: TAG_KINDS, required: true },
    // A switched-off code opens a "this item no longer works" page instead of the review page.
    status: { type: String, enum: ["active", "off"], default: "active" },
    pack: { type: Schema.Types.ObjectId, ref: "SetupPack", default: null }, // the delivery it came in
    offAt: { type: Date, default: null },
  },
  { timestamps: true },
);
tagSchema.index({ pack: 1 });

export type TagDoc = InferSchemaType<typeof tagSchema>;
export const Tag: Model<TagDoc> = models.Tag ?? model("Tag", tagSchema);
