import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { packSteps, StepTrack } from "@/components/step-track";
import { requireOwner } from "@/lib/auth";
import { getPlans, priceOf } from "@/lib/billing";
import { whatsappLink } from "@/lib/contact";
import { db } from "@/lib/db";
import { formatDay, METHOD_NAMES, PACK_STEPS, PAYMENT_STATUS, PLAN_NAMES } from "@/lib/labels";
import { describeItems, type CartLine } from "@/lib/shop";
import type { PlanCode } from "@/models/Plan";
import { formatPKR, INTERVAL_LABEL } from "@/lib/plans";
import { Payment } from "@/models/Payment";
import { SetupPack } from "@/models/SetupPack";

export const metadata: Metadata = { title: "Plan & billing" };

// Always reachable, even when the plan has lapsed: this is where the owner pays to unlock.
export default async function BillingPage() {
  const { business, access } = await requireOwner();
  if (access.state === "none") redirect("/checkout");
  await db();
  const [plans, payments, pack] = await Promise.all([
    getPlans(),
    Payment.find({ business: business.id, status: { $ne: "pending" } }).sort({ createdAt: -1 }).limit(24).lean(),
    SetupPack.findOne({ business: business.id }).sort({ createdAt: -1 }).lean(),
  ]);
  const plan = plans.find((p) => p.code === access.plan);
  const status = {
    active: { label: "Active", tone: "pill-positive" },
    renew_soon: { label: `Renews in ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"}`, tone: "pill-notice" },
    grace: { label: "Payment due", tone: "pill-notice" },
    locked: { label: "Locked", tone: "pill-negative" },
    none: { label: "No plan", tone: "" },
  }[access.state];

  return (
    <>
      <PageHeader
        title="Plan & billing"
        lede={
          access.state === "locked"
            ? `Your plan ended on ${formatDay(access.paidUntil!)}. Your review page still works; pay to open the dashboard again.`
            : `Paid until ${formatDay(access.paidUntil!)}. Every payment adds ${access.interval === "year" ? "a year" : "a month"} after that date.`
        }
      >
        <Link href="/checkout" className="btn btn-sm">
          {access.state === "locked" || access.state === "grace" ? "Pay now" : "Renew early"}
        </Link>
      </PageHeader>

      {business.suspended && (
        <div className="notice notice-negative mb-4">
          <span className="flex-1">This account is paused by Reputra, and your review page is off. Message us to sort it out.</span>
          <a href={whatsappLink(`Assalam o Alaikum, my Reputra account (${business.name}) is paused.`)} target="_blank" rel="noopener" className="btn btn-sm">
            Message Reputra
          </a>
        </div>
      )}

      <section className="panel p-5 sm:p-6" aria-labelledby="plan-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="plan-title" className="text-sm text-muted">
              Your plan
            </h2>
            <p className="mt-1 text-xl font-semibold">{PLAN_NAMES[access.plan!]}</p>
          </div>
          <span className={`pill ${status.tone}`}>{status.label}</span>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="num mt-0.5 font-medium">
              {plan ? formatPKR(priceOf(plan, access.interval!)) : "—"}
              <span className="font-normal text-muted"> / {access.interval}</span>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Billing</dt>
            <dd className="mt-0.5 font-medium">{INTERVAL_LABEL[access.interval!]}</dd>
          </div>
          <div>
            <dt className="text-muted">Paid until</dt>
            <dd className="mt-0.5 font-medium">{formatDay(access.paidUntil!)}</dd>
          </div>
          <div>
            <dt className="text-muted">{access.state === "grace" || access.state === "locked" ? "Dashboard locks" : "Grace after that"}</dt>
            <dd className="mt-0.5 font-medium">{access.state === "grace" || access.state === "locked" ? formatDay(access.locksOn!) : "7 days"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-rule pt-5">
          {plans
            .filter((p) => p.code !== access.plan)
            .map((p) => (
              <Link key={p.code} href={`/checkout?plan=${p.code}`} className="btn btn-secondary btn-sm">
                Switch to {p.name}
              </Link>
            ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="pack-title">
        <SectionTitle>
          <span id="pack-title">Counter stand & tap card</span>
        </SectionTitle>
        {pack && pack.status !== "canceled" ? (
          <>
            <StepTrack steps={packSteps(pack.status, PACK_STEPS)} label="Counter stand and tap card" />
            <p className="mt-3 text-sm text-muted">
              {pack.stands} stand and {pack.cards} card, free with your first payment · delivery to {pack.contactName}, {pack.address}, {pack.city}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">{pack ? "Canceled, because the first payment wasn’t received." : "Set up with the Reputra team in person."}</p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="payments-title">
        <SectionTitle
          action={
            <a href={whatsappLink(`Assalam o Alaikum, a question about a Reputra payment for ${business.name}.`)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Question about a payment?
            </a>
          }
        >
          <span id="payments-title">Payments</span>
        </SectionTitle>
        <div className="panel overflow-x-auto px-5 pt-4 pb-1 sm:px-6">
          <table className="tbl min-w-[640px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt</th>
                <th>Plan</th>
                <th>Paid by</th>
                <th className="r">Amount</th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {payments.map((p) => {
                const s = PAYMENT_STATUS[p.status];
                return (
                  <tr key={String(p._id)}>
                    <td className="whitespace-nowrap">{formatDay(p.createdAt)}</td>
                    <td className="font-mono text-[0.8125rem]">{p.reference}</td>
                    <td>
                      {p.kind === "shop" ? (
                        <>
                          Shop order
                          <span className="block text-xs text-muted">{describeItems(p.items as CartLine[])}</span>
                        </>
                      ) : (
                        <>
                          {PLAN_NAMES[p.plan as PlanCode]} · {p.interval === "year" ? "1 year" : "1 month"}
                          {p.firstPayment && <span className="block text-xs text-muted">with free stand and card</span>}
                        </>
                      )}
                    </td>
                    <td>
                      {METHOD_NAMES[p.method]}
                      {p.transactionId && <span className="block font-mono text-xs text-muted">TID {p.transactionId}</span>}
                    </td>
                    <td className="r num font-medium whitespace-nowrap">{formatPKR(p.amount)}</td>
                    <td className="r">
                      <span className={`pill ${s.tone ? `pill-${s.tone}` : ""}`} title={p.reviewNote || undefined}>
                        {s.label}
                      </span>
                      {p.status === "rejected" && p.reviewNote && <span className="mt-1 block text-xs text-muted">{p.reviewNote}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          “Checking” means your plan is already on and we’re matching the transfer, usually within a few hours.
        </p>
      </section>
    </>
  );
}
