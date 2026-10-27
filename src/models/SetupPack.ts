import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// The acrylic counter stand and NFC tap card that come free with the first payment.
// The team moves each pack along these steps from the admin side.
export const PACK_STATUSES = ["new", "printing", "on_the_way", "installed", "canceled"] as const;
export type PackStatus = (typeof PACK_STATUSES)[number];

const setupPackSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    stands: { type: Number, default: 1, min: 0 },
    cards: { type: Number, default: 1, min: 0 },
    contactName: { type: String, required: true, trim: true, maxlength: 80 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, enum: PACK_STATUSES, default: "new" },
    history: {
      type: [
        {
          _id: false,
          status: { type: String, enum: PACK_STATUSES, required: true },
          at: { type: Date, required: true },
          by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
setupPackSchema.index({ status: 1, createdAt: 1 });

export type SetupPackDoc = InferSchemaType<typeof setupPackSchema>;
export const SetupPack: Model<SetupPackDoc> = models.SetupPack ?? model("SetupPack", setupPackSchema);
