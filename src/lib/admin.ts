import "server-only";
import { PLAN_NAMES } from "./labels";
import { describeItems, type CartLine } from "./shop";
import { Types } from "mongoose";
import { db } from "./db";
import { accessFrom, type Access } from "./billing";
import { Business } from "@/models/Business";
import { Event } from "@/models/Event";
import { Payment } from "@/models/Payment";
import { Plan, type PlanCode } from "@/models/Plan";
import { SetupPack, type PackStatus } from "@/models/SetupPack";
import { Subscription } from "@/models/Subscription";
import { User } from "@/models/User";

// Read models for the admin side. Reputra will have hundreds of businesses, not
// millions, so lists load whole and filter in memory where that keeps the code plain.

const DAY = 86_400_000;

export type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  category: string;
  suspended: boolean;
  demo: boolean;
  createdAt: Date;
  owner: { id: string; name: string; email: string; phone: string; lastLoginAt: Date | null };
  access: Access;
};

export async function listBusinesses(): Promise<BusinessRow[]> {
  await db();
  const [businesses, owners, subs] = await Promise.all([
    Business.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: "owner" }).lean(),
    Subscription.find().lean(),
  ]);
  const ownerById = new Map(owners.map((o) => [String(o._id), o]));
  const subByBusiness = new Map(subs.map((s) => [String(s.business), s]));
  return businesses.map((b) => {
    const o = ownerById.get(String(b.owner));
    return {
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      city: b.city,
      category: b.category,
      suspended: b.status === "suspended",
      demo: b.demo,
      createdAt: b.createdAt,
      owner: {
        id: String(b.owner),
        name: o?.name ?? "—",
        email: o?.email ?? "—",
        phone: o?.phone ?? "",
        lastLoginAt: o?.lastLoginAt ?? null,
      },
      access: accessFrom(subByBusiness.get(String(b._id)) ?? null),
    };
  });
}

export async function getOverview() {
  await db();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const all = await listBusinesses();
  // Company totals count real businesses only; demo accounts are sample data.
  const rows = all.filter((r) => !r.demo);
  const demoIds = all.filter((r) => r.demo).map((r) => new Types.ObjectId(r.id));
  const [plans, toCheck, openPacks, paidThisMonth, clicks] = await Promise.all([
    Plan.find().lean(),
    Payment.countDocuments({ status: "submitted" }),
    SetupPack.countDocuments({ status: { $in: ["new", "printing", "on_the_way"] } }),
    Payment.aggregate<{ _id: null; total: number }>([
      { $match: { status: "confirmed", createdAt: { $gte: monthStart }, business: { $nin: demoIds } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Event.countDocuments({ type: "google_click", at: { $gte: new Date(now.getTime() - 30 * DAY) }, business: { $nin: demoIds } }),
  ]);

  const price = new Map(plans.map((p) => [p.code as PlanCode, p]));
  const paying = rows.filter((r) => !r.suspended && ["active", "renew_soon", "grace"].includes(r.access.state));
  // Monthly recurring revenue: yearly plans count as a twelfth of their price.
  const mrr = paying.reduce((sum, r) => {
    const p = r.access.plan ? price.get(r.access.plan) : undefined;
    if (!p) return sum;
    return sum + (r.access.interval === "year" ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice);
  }, 0);

  return {
    paying: paying.length,
    mrr,
    collectedThisMonth: paidThisMonth[0]?.total ?? 0,
    toCheck,
    openPacks,
    renewSoon: rows.filter((r) => r.access.state === "renew_soon"),
    inGrace: rows.filter((r) => r.access.state === "grace"),
    locked: rows.filter((r) => r.access.state === "locked"),
    notPaid: rows.filter((r) => r.access.state === "none"),
    googleClicks30d: clicks,
    total: rows.length,
  };
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];

export async function listPayments(filter: { status?: string[]; businessId?: string } = {}, limit = 200) {
  await db();
  const query: Record<string, unknown> = {};
  if (filter.status?.length) query.status = { $in: filter.status };
  if (filter.businessId) query.business = new Types.ObjectId(filter.businessId);
  const payments = await Payment.find(query).sort({ createdAt: -1 }).limit(limit).populate<{ business: { _id: unknown; name: string; demo: boolean } }>("business", "name demo").lean();
  return payments.map((p) => ({
    id: String(p._id),
    reference: p.reference,
    businessId: String(p.business?._id ?? ""),
    businessName: p.business?.name ?? "—",
    demo: Boolean(p.business?.demo),
    plan: p.plan as PlanCode,
    interval: p.interval,
    kind: (p.kind ?? "plan") as "plan" | "shop",
    // What it paid for, in one line: "Basic · 1 month" or "Shop · 2 stands, 1 card".
    what: p.kind === "shop" ? `Shop · ${describeItems(p.items as CartLine[])}` : `${PLAN_NAMES[p.plan as PlanCode]} · ${p.interval === "year" ? "1 year" : "1 month"}`,
    amount: p.amount,
    method: p.method,
    provider: p.provider,
    transactionId: p.transactionId,
    payerName: p.payerName,
    status: p.status,
    firstPayment: p.firstPayment,
    periodEnd: p.periodEnd,
    reviewNote: p.reviewNote,
    createdAt: p.createdAt,
  }));
}

export type PackRow = Awaited<ReturnType<typeof listPacks>>[number];

export async function listPacks(filter: { status?: PackStatus[]; businessId?: string } = {}) {
  await db();
  const query: Record<string, unknown> = {};
  if (filter.status?.length) query.status = { $in: filter.status };
  if (filter.businessId) query.business = new Types.ObjectId(filter.businessId);
  const packs = await SetupPack.find(query)
    .sort({ createdAt: 1 })
    .populate<{ business: { _id: unknown; name: string; slug: string } }>("business", "name slug")
    .populate<{ payment: { status: string; reference: string } }>("payment", "status reference")
    .lean();
  return packs.map((p) => ({
    id: String(p._id),
    businessId: String(p.business?._id ?? ""),
    businessName: p.business?.name ?? "—",
    slug: p.business?.slug ?? "",
    stands: p.stands,
    cards: p.cards,
    stickers: p.stickers ?? 0,
    fromShop: Boolean(p.fromShop),
    contactName: p.contactName,
    contactPhone: p.contactPhone,
    address: p.address,
    city: p.city,
    status: p.status as PackStatus,
    paymentStatus: p.payment?.status ?? "—",
    paymentReference: p.payment?.reference ?? "",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getBusinessDetail(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const row = (await listBusinesses()).find((b) => b.id === id);
  if (!row) return null;
  const business = await Business.findById(id).select("googleReviewUrl adminNote").lean();
  const [payments, packs] = await Promise.all([listPayments({ businessId: id }, 50), listPacks({ businessId: id })]);
  return { ...row, googleReviewUrl: business?.googleReviewUrl ?? "", adminNote: business?.adminNote ?? "", payments, packs };
}
