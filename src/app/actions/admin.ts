"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  ACCOUNTS_TAG,
  applyPayment,
  confirmPayment,
  createPayment,
  DuplicateTransactionError,
  getPlans,
  PLANS_TAG,
  rejectPayment,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { slugify, toWhatsAppNumber } from "@/lib/format";
import { keep, type FormState } from "@/lib/form-state";
import { businessTag } from "@/lib/public";
import { Business, CATEGORIES } from "@/models/Business";
import { INTERVALS, Plan, PLAN_CODES } from "@/models/Plan";
import { PAYMENT_METHODS } from "@/models/Payment";
import { PaymentAccount, TRANSFER_METHODS } from "@/models/PaymentAccount";
import { PACK_STATUSES, SetupPack } from "@/models/SetupPack";
import { User } from "@/models/User";

// Everything the Reputra team does from /admin. Every action re-checks the admin role.

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
}

// ---------------------------------------------------------------------------
// Payments

export async function confirmPaymentAction(form: FormData) {
  const admin = await requireAdmin();
  await confirmPayment(String(form.get("id")), admin.id);
  refresh();
}

export async function rejectPaymentAction(form: FormData) {
  const admin = await requireAdmin();
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || "Transfer not found";
  await rejectPayment(String(form.get("id")), admin.id, note);
  refresh();
}

// Cash at the counter, or a transfer the owner told the team about directly.
const recordSchema = z.object({
  businessId: z.string().min(1),
  plan: z.enum(PLAN_CODES),
  interval: z.enum(INTERVALS),
  method: z.enum(PAYMENT_METHODS.filter((m) => m !== "card") as [string, ...string[]]),
  transactionId: z.string().trim().max(64).optional().default(""),
});

export async function recordPayment(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const values = keep(form, "plan", "interval", "method", "transactionId");
  const parsed = recordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const plan = (await getPlans()).find((p) => p.code === parsed.data.plan);
  if (!plan) return { error: "That plan is switched off.", values };

  try {
    const payment = await createPayment({
      businessId: parsed.data.businessId,
      plan,
      interval: parsed.data.interval,
      method: parsed.data.method as (typeof PAYMENT_METHODS)[number],
      provider: "manual",
      status: "confirmed",
      transactionId: parsed.data.transactionId,
      reviewedBy: admin.id,
    });
    await applyPayment(payment._id);
  } catch (err) {
    if (err instanceof DuplicateTransactionError) return { error: "This transaction ID is already on another payment.", values };
    throw err;
  }
  refresh();
  return { ok: "Payment recorded and the plan extended." };
}

// ---------------------------------------------------------------------------
// Setup packs

export async function movePack(form: FormData) {
  const admin = await requireAdmin();
  const status = z.enum(PACK_STATUSES).parse(form.get("status"));
  await db();
  await SetupPack.updateOne(
    { _id: String(form.get("id")) },
    { $set: { status }, $push: { history: { status, at: new Date(), by: admin.id } } },
  );
  refresh();
}

// ---------------------------------------------------------------------------
// Businesses

export async function setBusinessStatus(form: FormData) {
  await requireAdmin();
  const status = z.enum(["active", "suspended"]).parse(form.get("status"));
  await db();
  const business = await Business.findByIdAndUpdate(String(form.get("id")), { $set: { status } }, { returnDocument: "after" }).lean();
  if (business) updateTag(businessTag(business.slug));
  refresh();
}

export async function saveAdminNote(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const note = String(form.get("adminNote") ?? "").slice(0, 2000);
  await db();
  await Business.updateOne({ _id: String(form.get("id")) }, { $set: { adminNote: note } });
  refresh();
  return { ok: "Note saved.", values: { adminNote: note } };
}

// Gives the owner a new password to read out to them. Every device they're logged in on is signed out.
export async function resetOwnerPassword(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const password = randomBytes(6).toString("base64url");
  await db();
  const user = await User.findOneAndUpdate(
    { _id: String(form.get("userId")), role: "owner" },
    { $set: { passwordHash: await bcrypt.hash(password, 10) }, $inc: { sessionVersion: 1 } },
  );
  if (!user) return { error: "Owner not found." };
  return { ok: password };
}

// Signing up a business in person: the team creates the account and hands over the login.
const addSchema = z.object({
  name: z.string().trim().min(2, "Enter the owner’s name.").max(80),
  email: z.email("Enter the owner’s email.").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .transform((v) => toWhatsAppNumber(v))
    .refine((v): v is string => v !== null, "Enter the owner’s WhatsApp number."),
  business: z.string().trim().min(2, "Enter the business name.").max(80),
  category: z.enum(CATEGORIES).catch("other"),
  city: z.string().trim().min(2, "Enter the city.").max(60),
});

export async function addBusiness(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const values = keep(form, "name", "email", "phone", "business", "category", "city");
  const parsed = addSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const d = parsed.data;

  await db();
  if (await User.exists({ email: d.email })) return { error: "An account with this email already exists.", values };
  const password = randomBytes(6).toString("base64url");
  const user = await User.create({ name: d.name, email: d.email, phone: d.phone, passwordHash: await bcrypt.hash(password, 10) });
  let slug = slugify(d.business);
  if (await Business.exists({ slug })) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const business = await Business.create({ owner: user._id, name: d.business, slug, category: d.category, city: d.city });

  refresh();
  // The password is shown once on the form, never put in a URL.
  return { ok: password, values: { businessId: String(business._id), email: d.email } };
}

// ---------------------------------------------------------------------------
// Settings: prices and where transfers go

const priceSchema = z.object({
  code: z.enum(PLAN_CODES),
  monthlyPrice: z.coerce.number().int("Whole rupees only.").min(0).max(1_000_000),
  yearlyPrice: z.coerce.number().int("Whole rupees only.").min(0).max(10_000_000),
});

export async function savePlanPrice(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = priceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db();
  await Plan.updateOne({ code: parsed.data.code }, { $set: { monthlyPrice: parsed.data.monthlyPrice, yearlyPrice: parsed.data.yearlyPrice } });
  updateTag(PLANS_TAG);
  refresh();
  return { ok: "Price saved. New payments use it; paid periods don’t change." };
}

const accountSchema = z.object({
  method: z.enum(TRANSFER_METHODS),
  accountTitle: z.string().trim().min(2, "Enter the account title.").max(80),
  accountNumber: z.string().trim().min(4, "Enter the number customers send to.").max(40),
  bankName: z.string().trim().max(60).optional().default(""),
  iban: z.string().trim().max(34).optional().default(""),
  active: z.literal("on").optional(),
});

export async function savePaymentAccount(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = accountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { active, ...rest } = parsed.data;
  await db();
  await PaymentAccount.updateOne({ method: rest.method }, { $set: { ...rest, active: active === "on", placeholder: false } }, { upsert: true });
  updateTag(ACCOUNTS_TAG);
  refresh();
  return { ok: "Saved. Checkout shows it now." };
}
