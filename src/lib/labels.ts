// Words shown for stored values. One place, so the dashboard, checkout and admin say the same thing.
import type { PlanCode } from "@/models/Plan";
import type { PaymentMethod, PaymentStatus } from "@/models/Payment";
import type { PackStatus } from "@/models/SetupPack";
import type { Category } from "@/models/Business";

export const PLAN_NAMES: Record<PlanCode, string> = { basic: "Basic", pro: "Pro", business: "Business" };

export const METHOD_NAMES: Record<PaymentMethod, string> = {
  raast: "Raast",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank transfer",
  card: "Card or wallet",
  cash: "Cash",
};

// What the owner sees for a payment, and its pill style.
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: "" | "positive" | "negative" | "notice" }> = {
  pending: { label: "Not finished", tone: "" },
  submitted: { label: "Checking", tone: "notice" },
  confirmed: { label: "Paid", tone: "positive" },
  rejected: { label: "Not received", tone: "negative" },
  failed: { label: "Failed", tone: "" },
};

export const PACK_STEPS: { status: Exclude<PackStatus, "canceled">; label: string; owner: string }[] = [
  { status: "new", label: "Ordered", owner: "We’ve got your order" },
  { status: "printing", label: "Printing", owner: "Your items are being printed" },
  { status: "on_the_way", label: "On the way", owner: "On the way to you" },
  { status: "installed", label: "Installed", owner: "Delivered and set up" },
];

export const PACK_LABEL: Record<PackStatus, string> = {
  new: "Ordered",
  printing: "Printing",
  on_the_way: "On the way",
  installed: "Installed",
  canceled: "Canceled",
};

export const CATEGORY_NAMES: Record<Category, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  salon: "Salon",
  clinic: "Clinic",
  gym: "Gym",
  shop: "Shop",
  hotel: "Hotel",
  other: "Other",
};

const dateFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
const shortFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
const timeFmt = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });

export const formatDay = (d: Date | string) => dateFmt.format(new Date(d));
export const formatShortDay = (d: Date | string) => shortFmt.format(new Date(d));

// "2 h ago", "Yesterday", "3 Oct": recency in words, as people say it.
export function formatWhen(d: Date | string, now = new Date()) {
  const date = new Date(d);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 12) return `${Math.round(minutes / 60)} h ago`;
  const key = (x: Date) => shortFmt.format(x);
  if (key(date) === key(now)) return `Today, ${timeFmt.format(date)}`;
  if (key(date) === key(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${timeFmt.format(date)}`;
  return shortFmt.format(date);
}

// A business's plan as the team reads it in lists.
export const ACCESS_LABEL: Record<"none" | "active" | "renew_soon" | "grace" | "locked", { label: string; tone: string }> = {
  none: { label: "Not paid", tone: "" },
  active: { label: "Paying", tone: "pill-positive" },
  renew_soon: { label: "Renews soon", tone: "pill-notice" },
  grace: { label: "Payment due", tone: "pill-notice" },
  locked: { label: "Lapsed", tone: "pill-negative" },
};

// 923001234567 → 0300 1234567, the way people write it in Pakistan.
export function formatPhone(n: string) {
  if (!n) return "—";
  return n.startsWith("92") && n.length === 12 ? `0${n.slice(2, 5)} ${n.slice(5)}` : `+${n}`;
}
