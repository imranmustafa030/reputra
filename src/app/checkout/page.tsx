import type { Metadata } from "next";
import { Suspense } from "react";
import { whatsappLink } from "@/lib/contact";
import { requireOwner } from "@/lib/auth";
import { getPaymentAccounts, getPlans } from "@/lib/billing";
import { activeGateway } from "@/lib/gateway";
import { PLAN_CODES, type PlanCode } from "@/models/Plan";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Choose your plan" };

export default function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  return (
    <Suspense fallback={<div className="h-[640px] rounded-2xl bg-hover" aria-busy="true" />}>
      <Checkout searchParams={searchParams} />
    </Suspense>
  );
}

async function Checkout({ searchParams }: Pick<PageProps<"/checkout">, "searchParams">) {
  const [{ user, business, access }, query, plans, accounts] = await Promise.all([requireOwner(), searchParams, getPlans(), getPaymentAccounts()]);

  if (business.suspended) {
    return (
      <div className="mx-auto max-w-[520px] py-16 text-center">
        <h1 className="text-2xl font-semibold">This account is paused</h1>
        <p className="mt-2 text-muted">Message Reputra on WhatsApp and we’ll sort it out.</p>
        <a className="btn mt-6" href={whatsappLink(`Assalam o Alaikum, my Reputra account (${business.name}) is paused.`)} target="_blank" rel="noopener">
          Message Reputra
        </a>
      </div>
    );
  }

  const asked = String(query.plan ?? "");
  const plan: PlanCode = PLAN_CODES.includes(asked as PlanCode) ? (asked as PlanCode) : (access.plan ?? "pro");
  const gateway = activeGateway();
  const isNew = access.state === "none";
  // A renewal adds its time after the current paid-until date, unless the plan has already ended.
  const startsFrom = access.paidUntil && access.paidUntil > new Date() ? access.paidUntil : new Date();

  return (
    <CheckoutForm
      isNew={isNew}
      plans={plans}
      accounts={accounts}
      gateway={gateway ? { label: gateway.label } : null}
      initial={{
        plan,
        interval: query.interval === "year" ? "year" : (access.interval ?? "month"),
        contactName: user.name,
        contactPhone: user.phone ? `0${user.phone.slice(2)}` : "",
        city: business.city,
      }}
      startsFrom={startsFrom.toISOString()}
      failed={query.failed === "1"}
    />
  );
}
