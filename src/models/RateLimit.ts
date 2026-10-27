import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Counters for login attempts and other abuse-prone actions. MongoDB deletes each
// document when its window ends (TTL index), so the collection stays tiny.
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export type RateLimitDoc = InferSchemaType<typeof rateLimitSchema>;
export const RateLimit: Model<RateLimitDoc> = models.RateLimit ?? model("RateLimit", rateLimitSchema);
