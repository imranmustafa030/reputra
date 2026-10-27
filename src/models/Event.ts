import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const EVENT_TYPES = ["visit", "google_click", "whatsapp_sent", "feedback"] as const;
// How the customer reached the review page: the counter stand's QR, the NFC tap, a WhatsApp message, or a plain link.
export const SOURCES = ["qr", "nfc", "wa", "direct"] as const;
export type Source = (typeof SOURCES)[number];

export function toSource(value: unknown): Source {
  return SOURCES.includes(value as Source) ? (value as Source) : "direct";
}

const eventSchema = new Schema({
  business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  type: { type: String, enum: EVENT_TYPES, required: true },
  source: { type: String, enum: SOURCES, default: "direct" },
  at: { type: Date, default: Date.now },
});
// Stats always ask "this business, since a date".
eventSchema.index({ business: 1, at: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const Event: Model<EventDoc> = models.Event ?? model("Event", eventSchema);
