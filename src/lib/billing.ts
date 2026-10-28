import "server-only";
import { randomInt } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { Types } from "mongoose";
import { db } from "./db";
import { addInterval, DEFAULT_PLANS, GRACE_DAYS, REMIND_DAYS, yearlyFromMonthly } from "./plans";
import { Plan, type Interval, type PlanCode } from "@/models/Plan";
import { Subscription, type SubscriptionDoc } from "@/models/Subscription";
import { Payment, type PaymentMethod, type PaymentStatus } from "@/models/Payment";
import { PaymentAccount, type TransferMethod } from "@/models/PaymentAccount";
import { SetupPack } from "@/models/SetupPack";
import { cartTotal, type CartLine } from "./shop";
import { ensurePackTags } from "./tags";

// Billing rules in one place. Plans are prepaid: each payment adds one month or one
// year after the current paid-until date. Transfers switch the plan on as soon as the
// owner submits the transaction ID; an admin confirms or rejects it afterwards, and a
// rejection takes the added time back.

export const PLANS_TAG = "plans";
export const ACCOUNTS_TAG = "payment-accounts";
const DAY = 86_400_000;

export type PlanView = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular: boolean;
};

export async function getPlans(): Promise<PlanView[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("hours");
  await db();
  const plans = await Plan.find({ active: true }).sort({ sortOrder: 1 }).lean();
  // Before the seed has run, sell from the starting price list rather than show an empty checkout.
  if (plans.length === 0 && !(await Plan.exists({}))) {
    return DEFAULT_PLANS.map((p) => ({ ...p, yearlyPrice: yearlyFromMonthly(p.monthlyPrice), features: [...p.features], popular: Boolean(p.popular) }));
  }
  return plans.map((p) => ({
    code: p.code as PlanCode,
    name: p.name,
    tagline: p.tagline,
    monthlyPrice: p.monthlyPrice,
    yearlyPrice: p.yearlyPrice,
    features: [...p.features],
    popular: p.popular,
  }));
}

export const priceOf = (plan: Pick<PlanView, "monthlyPrice" | "yearlyPrice">, interval: Interval) =>
  interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;

export type AccountView = {
  method: TransferMethod;
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  iban: string;
};

export async function getPaymentAccounts(): Promise<AccountView[]> {
  "use cache";
  cacheTag(ACCOUNTS_TAG);
  cacheLife("hours");
  await db();
  const accounts = await PaymentAccount.find({ active: true, placeholder: { $ne: true } }).sort({ sortOrder: 1 }).lean();
  return accounts.map((a) => ({
    method: a.method as TransferMethod,
    accountTitle: a.accountTitle,
    accountNumber: a.accountNumber,
    bankName: a.bankName,
    iban: a.iban,
  }));
}

// ---------------------------------------------------------------------------
// Access: what a subscription allows right now

export type AccessState = "none" | "active" | "renew_soon" | "grace" | "locked";
export type Access = {
  state: AccessState;
  plan: PlanCode | null;
  interval: Interval | null;
  paidUntil: Date | null;
  daysLeft: number; // whole days until paidUntil; negative once it has passed
  locksOn: Date | null; // paidUntil + grace
};

export function accessFrom(sub: Pick<SubscriptionDoc, "plan" | "interval" | "currentPeriodEnd"> | null, now = new Date()): Access {
  if (!sub) return { state: "none", plan: null, interval: null, paidUntil: null, daysLeft: 0, locksOn: null };
  const paidUntil = new Date(sub.currentPeriodEnd);
  const left = paidUntil.getTime() - now.getTime();
  const locksOn = new Date(paidUntil.getTime() + GRACE_DAYS * DAY);
  const state: AccessState =
    left > REMIND_DAYS * DAY ? "active" : left > 0 ? "renew_soon" : now < locksOn ? "grace" : "locked";
  return {
    state,
    plan: sub.plan as PlanCode,
    interval: sub.interval as Interval,
    paidUntil,
    daysLeft: Math.ceil(left / DAY),
    locksOn,
  };
}

export const canUseDashboard = (access: Access) => access.state !== "none" && access.state !== "locked";

// ---------------------------------------------------------------------------
// Payments

// RP- and six characters with no look-alikes (no 0/O, 1/I), easy to read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function newReference() {
  let code = "RP-";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export class DuplicateTransactionError extends Error {}

type NewPayment = {
  businessId: string;
  plan: PlanView;
  interval: Interval;
  method: PaymentMethod;
  provider: "manual" | "test" | "safepay";
  status: Extract<PaymentStatus, "pending" | "submitted" | "confirmed">;
  transactionId?: string;
  payerName?: string;
  delivery?: { contactName: string; contactPhone: string; address: string; city: string } | null;
  reviewedBy?: string;
};

// The amount always comes from the price list on the server, never from the form.
export async function createPayment(input: NewPayment) {
  await db();
  const firstPayment = !(await Subscription.exists({ business: input.businessId }));
  for (let attempt = 0; ; attempt++) {
    try {
      return await Payment.create({
        business: input.businessId,
        reference: newReference(),
        plan: input.plan.code,
        interval: input.interval,
        amount: priceOf(input.plan, input.interval),
        method: input.method,
        provider: input.provider,
        status: input.status,
        transactionId: input.transactionId?.trim().toUpperCase() ?? "",
        payerName: input.payerName ?? "",
        firstPayment,
        delivery: firstPayment ? (input.delivery ?? null) : null,
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt: input.reviewedBy ? new Date() : null,
      });
    } catch (err) {
      const dup = err as { code?: number; keyPattern?: Record<string, number> };
      if (dup.code === 11000 && dup.keyPattern?.transactionId) throw new DuplicateTransactionError();
      if (dup.code === 11000 && dup.keyPattern?.reference && attempt < 4) continue;
      throw err;
    }
  }
}

type NewShopOrder = {
  businessId: string;
  items: CartLine[];
  method: PaymentMethod;
  transactionId: string;
  payerName: string;
  delivery: { contactName: string; contactPhone: string; address: string; city: string };
};

// A shop order waits for the team to find the transfer; only then is anything printed.
export async function createShopOrder(input: NewShopOrder) {
  await db();
  for (let attempt = 0; ; attempt++) {
    try {
      return await Payment.create({
        business: input.businessId,
        reference: newReference(),
        kind: "shop",
        items: input.items,
        amount: cartTotal(input.items),
        method: input.method,
        provider: "manual",
        status: "submitted",
        transactionId: input.transactionId.trim().toUpperCase(),
        payerName: input.payerName,
        delivery: input.delivery,
      });
    } catch (err) {
      const dup = err as { code?: number; keyPattern?: Record<string, number> };
      if (dup.code === 11000 && dup.keyPattern?.transactionId) throw new DuplicateTransactionError();
      if (dup.code === 11000 && dup.keyPattern?.reference && attempt < 4) continue;
      throw err;
    }
  }
}

// A confirmed shop order becomes a delivery for the team, with one code per item.
async function applyShopOrder(payment: InstanceType<typeof Payment>) {
  if (!payment.delivery || (await SetupPack.exists({ payment: payment._id }))) return;
  const qty = (kind: string) => payment.items.find((i) => i.kind === kind)?.qty ?? 0;
  const pack = await SetupPack.create({
    business: payment.business,
    payment: payment._id,
    stands: qty("stand"),
    cards: qty("card"),
    stickers: qty("sticker"),
    fromShop: true,
    contactName: payment.delivery.contactName,
    contactPhone: payment.delivery.contactPhone,
    address: payment.delivery.address,
    city: payment.delivery.city,
    history: [{ status: "new", at: new Date() }],
  });
  await ensurePackTags(pack._id);
}

// Adds the payment's month or year to the subscription (or, for a shop order, starts its
// delivery), once. Safe to call twice.
export async function applyPayment(paymentId: string | Types.ObjectId) {
  await db();
  const payment = await Payment.findOneAndUpdate(
    // A shop order applies only once the team confirms the transfer; a plan applies on submit.
    { _id: paymentId, applied: false, $or: [{ kind: "shop", status: "confirmed" }, { kind: { $ne: "shop" }, status: { $in: ["submitted", "confirmed"] } }] },
    { $set: { applied: true } },
    { returnDocument: "after" },
  );
  if (!payment) return;
  if (payment.kind === "shop") return applyShopOrder(payment);

  const now = new Date();
  const sub = await Subscription.findOne({ business: payment.business });
  const start = sub && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const end = addInterval(start, payment.interval as Interval);
  const plan = payment.plan as PlanCode;
  const interval = payment.interval as Interval;

  if (sub) {
    if (start === now) sub.currentPeriodStart = now;
    sub.currentPeriodEnd = end;
    sub.plan = plan;
    sub.interval = interval;
    sub.status = "active";
    sub.canceledAt = null;
    await sub.save();
  } else {
    await Subscription.create({
      business: payment.business,
      plan,
      interval,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
  }
  await Payment.updateOne({ _id: payment._id }, { $set: { periodStart: start, periodEnd: end } });

  if (payment.firstPayment && payment.delivery && !(await SetupPack.exists({ payment: payment._id }))) {
    const pack = await SetupPack.create({
      business: payment.business,
      payment: payment._id,
      contactName: payment.delivery.contactName,
      contactPhone: payment.delivery.contactPhone,
      address: payment.delivery.address,
      city: payment.delivery.city,
      history: [{ status: "new", at: now }],
    });
    await ensurePackTags(pack._id);
  }
}

export async function confirmPayment(paymentId: string, adminId: string | null, from: PaymentStatus[] = ["submitted"]) {
  await db();
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: from } },
    { $set: { status: "confirmed", reviewedBy: adminId, reviewedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (payment) await applyPayment(payment._id);
  return Boolean(payment);
}

export async function rejectPayment(paymentId: string, adminId: string, note: string) {
  await db();
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "submitted" },
    { $set: { status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), reviewNote: note } },
    { returnDocument: "after" },
  );
  if (!payment) return false;

  // Take back exactly the time this payment added, even if later payments were stacked after it.
  if (payment.applied && payment.periodStart && payment.periodEnd) {
    const added = payment.periodEnd.getTime() - payment.periodStart.getTime();
    await Subscription.updateOne({ business: payment.business }, [
      { $set: { currentPeriodEnd: { $subtract: ["$currentPeriodEnd", added] } } },
    ]);
  }
  if (payment.firstPayment) {
    await SetupPack.updateOne(
      { payment: payment._id, status: "new" },
      { $set: { status: "canceled" }, $push: { history: { status: "canceled", at: new Date(), by: adminId } } },
    );
  }
  return true;
}

export async function markPaymentFailed(paymentId: string) {
  await db();
  await Payment.updateOne({ _id: paymentId, status: "pending" }, { $set: { status: "failed" } });
}

export async function getSubscription(businessId: string) {
  await db();
  return Subscription.findOne({ business: businessId }).lean();
}
