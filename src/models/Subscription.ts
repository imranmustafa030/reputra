import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { INTERVALS, PLAN_CODES } from "./Plan";

// One per business, created by its first payment. Plans are prepaid: every payment
// moves currentPeriodEnd forward, and lib/billing.ts reads access from that date.
const subscriptionSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true, unique: true },
    plan: { type: String, enum: PLAN_CODES, required: true },
    interval: { type: String, enum: INTERVALS, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "canceled"], default: "active" },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema>;
export const Subscription: Model<SubscriptionDoc> = models.Subscription ?? model("Subscription", subscriptionSchema);
