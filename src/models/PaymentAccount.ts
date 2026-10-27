import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Where owners send transfers: Reputra's own Raast ID, wallets and bank account.
// Shown at checkout; edited by admins, so changing a number needs no deploy.
export const TRANSFER_METHODS = ["raast", "jazzcash", "easypaisa", "bank"] as const;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];

const paymentAccountSchema = new Schema(
  {
    method: { type: String, enum: TRANSFER_METHODS, required: true, unique: true },
    accountTitle: { type: String, required: true, trim: true, maxlength: 80 },
    accountNumber: { type: String, required: true, trim: true, maxlength: 40 }, // Raast ID, wallet number or account number
    bankName: { type: String, default: "", trim: true, maxlength: 60 },
    iban: { type: String, default: "", trim: true, maxlength: 34 },
    active: { type: Boolean, default: true },
    // Seeded sample details. Checkout never shows a placeholder; saving it in Admin → Settings clears the flag.
    placeholder: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PaymentAccountDoc = InferSchemaType<typeof paymentAccountSchema>;
export const PaymentAccount: Model<PaymentAccountDoc> = models.PaymentAccount ?? model("PaymentAccount", paymentAccountSchema);
