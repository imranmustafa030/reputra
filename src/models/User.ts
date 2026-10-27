import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Owners run one business each; admins are the Reputra team. Staff never get accounts.
export const ROLES = ["owner", "admin"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, default: "", trim: true, maxlength: 20 }, // 92XXXXXXXXXX, so admin can WhatsApp the owner
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "owner", index: true },
    // A disabled account can't log in, and its open sessions stop working.
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    // Bumped on password reset or disable: sessions carry the version they were issued with.
    sessionVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User: Model<UserDoc> = models.User ?? model("User", userSchema);
