import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, METHOD_NAMES, PLAN_NAMES } from "@/lib/labels";
import type { PlanCode } from "@/models/Plan";
import { formatPKR } from "@/lib/plans";
import { Payment } from "@/models/Payment";
import { AboutForm } from "./about-form";

export const metadata: Metadata = { title: "You’re on" };

export default function DonePage({ searchParams }: PageProps<"/checkout/done">) {
  return (
    <Suspense>
      <Done searchParams={searchParams} />
    </Suspense>
  );
}

async function Done({ searchParams }: Pick<PageProps<"/checkout/done">, "searchParams">) {
  const [{ business, access }, query] = await Promise.all([requireOwner(), searchParams]);
  await db();
  const payment = await Payment.findOne({ reference: String(query.ref ?? ""), business: business.id }).lean();
  if (!payment) redirect("/dashboard/billing");
  const checking = payment.status === "submitted";

  return (
    <div className="stagger mx-auto max-w-[560px] pt-6 sm:pt-12">
      <span className="done-mark" aria-hidden="true">
        <span className="wave" />
        <span className="wave" />
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="26" className="ring-line" />
          <path d="M18 29l7 7 13-15" className="tick-line" />
        </svg>
      </span>
      <h1 className="mt-6 text-[1.75rem] leading-9 font-semibold tracking-[-0.02em]">
        {payment.firstPayment ? `${business.name} is on Reputra` : "Your plan is renewed"}
      </h1>
      <p className="mt-2 text-muted">
        {PLAN_NAMES[payment.plan as PlanCode]} plan, paid until {access.paidUntil ? formatDay(access.paidUntil) : "—"}.
        {checking && " We’re matching your transfer now; you don’t need to do anything."}
      </p>

      <dl className="panel mt-8 grid gap-3 p-5 text-sm">
        <Row label="Receipt" value={<span className="font-mono">{payment.reference}</span>} />
        <Row label="Amount" value={<span className="num">{formatPKR(payment.amount)}</span>} />
        <Row label="Paid by" value={`${METHOD_NAMES[payment.method]}${payment.transactionId ? ` · TID ${payment.transactionId}` : ""}`} />
        <Row label="Status" value={<span className={`pill ${checking ? "pill-notice" : "pill-positive"}`}>{checking ? "Checking" : "Paid"}</span>} />
      </dl>

      {payment.firstPayment && <AboutForm initial={business.description} />}

      {payment.firstPayment && (
        <div className="mt-8">
          <h2 className="font-semibold">What happens next</h2>
          <ol className="mt-3 grid gap-3 text-sm">
            <Next n={1} text="Add your Google review link in Settings, so the button opens your review box." />
            <Next n={2} text="We print your counter stand and tap card with your own QR code, and message you on WhatsApp to set a time." />
            <Next n={3} text="We set them up at your counter. Until then, you can already ask customers on WhatsApp." />
          </ol>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <a href={payment.firstPayment ? "/dashboard/settings#google" : "/dashboard"} className="btn">
          {payment.firstPayment ? "Add your Google link" : "Go to dashboard"}
        </a>
        {payment.firstPayment && (
          <a href="/dashboard" className="btn btn-secondary">
            Go to dashboard
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Next({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-active text-xs font-semibold">{n}</span>
      <span className="pt-0.5">{text}</span>
    </li>
  );
}
