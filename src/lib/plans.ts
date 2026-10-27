import type { Interval, PlanCode } from "@/models/Plan";

// The starting price list. Features list only what is built; planned ones say "coming soon".
// scripts/seed.ts writes it to the database once; after that
// admins edit prices in Admin → Settings and the database is the source of truth.
// A year costs ten months (two months free), as the website promises.
export const DEFAULT_PLANS: {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPrice: number;
  features: string[];
  popular?: boolean;
}[] = [
  {
    code: "basic",
    name: "Basic",
    tagline: "One location, one counter.",
    monthlyPrice: 3999,
    features: ["Your review page", "Counter stand, tap card and WhatsApp links", "Visits and Google numbers", "Private notes from customers", "WhatsApp support"],
  },
  {
    code: "pro",
    name: "Pro",
    tagline: "Busy counters with staff.",
    monthlyPrice: 7999,
    features: ["Everything in Basic", "Staff leaderboard (coming soon)", "Monthly report on WhatsApp (coming soon)", "Note alerts on WhatsApp (coming soon)"],
  },
  {
    code: "business",
    name: "Business",
    tagline: "Several branches.",
    monthlyPrice: 14999,
    features: ["Everything in Pro", "Every branch in one place (coming soon)"],
  },
];

export const yearlyFromMonthly = (monthly: number) => monthly * 10;

// Grace after a period ends before the dashboard locks. The review page keeps working.
export const GRACE_DAYS = 7;
// When the dashboard starts reminding the owner to renew.
export const REMIND_DAYS = 5;

export function addInterval(from: Date, interval: Interval) {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export const INTERVAL_LABEL: Record<Interval, string> = { month: "Monthly", year: "Yearly" };

export function formatPKR(amount: number) {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}
