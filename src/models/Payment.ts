import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { INTERVALS, PLAN_CODES } from "./Plan";

// How the money moved. Transfers are checked by hand; "card" goes through the online gateway.
export const PAYMENT_METHODS = ["raast", "jazzcash", "easypaisa", "bank", "card", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// pending:   sent to the online gateway, waiting for its answer
// submitted: the owner says they transferred; the plan is already on, an admin checks the transfer
// confirmed: the money arrived
// rejected:  an admin found no such transfer; the period this payment added is taken back
// failed:    the gateway declined or the owner abandoned it
export const PAYMENT_STATUSES = ["pending", "submitted", "confirmed", "rejected", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const paymentSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    // Short code the owner writes in the transfer note, e.g. RP-7K3Q9M, so admins can match it in the bank app.
    reference: { type: String, required: true, unique: true },
    plan: { type: String, enum: PLAN_CODES, required: true },
    interval: { type: String, enum: INTERVALS, required: true },
    amount: { type: Number, required: true, min: 0 }, // whole rupees
    currency: { type: String, default: "PKR" },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    provider: { type: String, enum: ["manual", "test", "safepay"], default: "manual" },
    transactionId: { type: String, default: "", trim: true, maxlength: 64 }, // the TID from the bank or wallet app
    payerName: { type: String, default: "", trim: true, maxlength: 80 },
    gatewayRef: { type: String, default: "" },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    // The stretch of plan this payment bought. Rejecting the payment rolls the subscription back to periodStart.
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    firstPayment: { type: Boolean, default: false }, // the one that comes with the free stand and card
    // Where the free stand and card go. Kept here until the payment is applied, which creates the SetupPack.
    delivery: {
      type: {
        _id: false,
        contactName: { type: String, required: true, trim: true, maxlength: 80 },
        contactPhone: { type: String, required: true, trim: true, maxlength: 20 },
        address: { type: String, required: true, trim: true, maxlength: 300 },
        city: { type: String, required: true, trim: true, maxlength: 60 },
      },
      default: null,
    },
    applied: { type: Boolean, default: false }, // its period has been added to the subscription
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true },
);
paymentSchema.index({ business: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
// One transaction ID pays once: the same TID can't be submitted twice for the same method.
paymentSchema.index(
  { method: 1, transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $gt: "" }, status: { $in: ["submitted", "confirmed"] } } },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const Payment: Model<PaymentDoc> = models.Payment ?? model("Payment", paymentSchema);
