import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// A private note a customer sends the owner from the review page.
const feedbackSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    name: { type: String, default: "", trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    source: { type: String, default: "direct" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
feedbackSchema.index({ business: 1, createdAt: -1 });

export type FeedbackDoc = InferSchemaType<typeof feedbackSchema>;
export const Feedback: Model<FeedbackDoc> = models.Feedback ?? model("Feedback", feedbackSchema);
