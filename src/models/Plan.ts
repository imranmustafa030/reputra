import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const PLAN_CODES = ["basic", "pro", "business"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const INTERVALS = ["month", "year"] as const;
export type Interval = (typeof INTERVALS)[number];

// The price list. Seeded from lib/plans.ts and edited by admins; prices are whole rupees.
const planSchema = new Schema(
  {
    code: { type: String, enum: PLAN_CODES, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "", trim: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },
    features: { type: [String], default: [] },
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true }, // inactive plans can't be bought; existing subscribers keep them
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PlanDoc = InferSchemaType<typeof planSchema>;
export const Plan: Model<PlanDoc> = models.Plan ?? model("Plan", planSchema);
