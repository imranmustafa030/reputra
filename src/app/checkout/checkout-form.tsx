"use client";

import { useActionState, useState } from "react";
import { Check, Lock } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { checkout } from "@/app/actions/checkout";
import { CopyButton } from "@/components/copy-button";
import { FormMessage, SubmitButton } from "@/components/form";
import { whatsappLink } from "@/lib/contact";
import { formatDay, METHOD_NAMES } from "@/lib/labels";
import { addInterval, formatPKR } from "@/lib/plans";
import type { AccountView, PlanView } from "@/lib/billing";
import type { Interval, PlanCode } from "@/models/Plan";

type Props = {
  isNew: boolean;
  plans: PlanView[];
  accounts: AccountView[];
  gateway: { label: string } | null;
  initial: { plan: PlanCode; interval: Interval; contactName: string; contactPhone: string; city: string };
  startsFrom: string;
  failed: boolean;
};

// One page, three numbered parts (plan, delivery, payment) and a summary that always shows
// the total and what it buys. Nothing is hidden behind a next button: an owner sees the
// whole deal at once and pays in one submit.
export function CheckoutForm({ isNew, plans, accounts, gateway, initial, startsFrom, failed }: Props) {
  const [state, action] = useActionState(checkout, undefined);
  const v = state?.values;
  const [planCode, setPlanCode] = useState<PlanCode>((v?.plan as PlanCode) || initial.plan);
  const [interval, setPeriod] = useState<Interval>((v?.interval as Interval) || initial.interval);
  const methods = [...accounts.map((a) => a.method), ...(gateway ? (["card"] as const) : [])];
  // Which numbered parts are complete, so each number turns into a check as the owner goes.
  const [filled, setFilled] = useState({ delivery: false, payment: false });
  function track(e: React.FormEvent<HTMLFormElement>) {
    const f = e.currentTarget.elements;
    const val = (n: string) => ((f.namedItem(n) as HTMLInputElement | null)?.value ?? "").trim();
    const delivery = !isNew || (val("contactName").length > 1 && val("contactPhone").replace(/\D/g, "").length >= 10 && val("address").length > 7 && val("city").length > 1);
    const payment = val("method") === "card" || /^[A-Za-z0-9-]{6,}$/.test(val("transactionId"));
    if (delivery !== filled.delivery || payment !== filled.payment) setFilled({ delivery, payment });
  }
  const [method, setMethod] = useState<string>(v?.method || methods[0] || "");

  const plan = plans.find((p) => p.code === planCode) ?? plans[0];
  const price = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
  const account = accounts.find((a) => a.method === method);
  const paidUntil = addInterval(new Date(startsFrom), interval);
  const savings = plan.monthlyPrice * 12 - plan.yearlyPrice;
  let step = 0;

  return (
    <form action={action} onChange={track}>
      <div className="mb-8">
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-[-0.02em]">{isNew ? "Choose your plan" : "Renew your plan"}</h1>
        <p className="mt-1 text-muted">
          {isNew
            ? "Pay once to start. Your counter stand and tap card come free with the first payment."
            : `Pays for ${interval === "year" ? "a year" : "a month"} after your current paid-until date.`}
        </p>
      </div>

      {failed && <div className="notice notice-negative mb-6">The online payment didn’t go through. Nothing was charged. Try again or pay by transfer.</div>}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="grid gap-10">
          {/* 1 · Plan */}
          <fieldset>
            <Legend n={++step} title="Plan" done />
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="segmented" role="radiogroup" aria-label="Billing period">
                <label>
                  <input type="radio" name="interval" value="month" checked={interval === "month"} onChange={() => setPeriod("month")} />
                  Monthly
                </label>
                <label>
                  <input type="radio" name="interval" value="year" checked={interval === "year"} onChange={() => setPeriod("year")} />
                  Yearly
                </label>
              </div>
              <span className="text-sm text-muted">Yearly: 2 months free</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {plans.map((p) => {
                const selected = p.code === planCode;
                return (
                  <label
                    key={p.code}
                    className={`relative flex cursor-pointer flex-col rounded-xl border bg-sheet p-4 transition-colors ${
                      selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-edge hover:border-control"
                    }`}
                  >
                    <input type="radio" name="plan" value={p.code} checked={selected} onChange={() => setPlanCode(p.code)} className="sr-only" />
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {selected && (
                        <span className="pop grid size-6 place-items-center rounded-full bg-ink text-paper">
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="mt-2">
                      <CountUp value={interval === "year" ? p.yearlyPrice : p.monthlyPrice} format="pkr" className="text-xl font-semibold" />
                      <span className="text-sm text-muted"> / {interval}</span>
                    </span>
                    <span className="mt-1 text-sm text-muted">{p.tagline}</span>
                    <ul className="mt-3 grid gap-1.5 border-t border-rule pt-3 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={2} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2 · Delivery, first payment only */}
          {isNew && (
            <fieldset>
              <Legend n={++step} title="Where should we bring your stand and card?" done={filled.delivery} />
              <p className="-mt-2 mb-4 text-sm text-muted">We print them with your QR code, bring them to your counter and set them up with you.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="contactName">
                    Contact name
                  </label>
                  <input className="input" id="contactName" name="contactName" defaultValue={v?.contactName ?? initial.contactName} autoComplete="name" required />
                </div>
                <div>
                  <label className="label" htmlFor="contactPhone">
                    Phone
                  </label>
                  <input
                    className="input"
                    id="contactPhone"
                    name="contactPhone"
                    inputMode="tel"
                    defaultValue={v?.contactPhone ?? initial.contactPhone}
                    placeholder="0300 1234567"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="address">
                    Business address
                  </label>
                  <input
                    className="input"
                    id="address"
                    name="address"
                    defaultValue={v?.address}
                    placeholder="Shop 4, Main Boulevard, Gulberg III"
                    autoComplete="street-address"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="city">
                    City
                  </label>
                  <input className="input" id="city" name="city" defaultValue={v?.city ?? initial.city} autoComplete="address-level2" required />
                </div>
              </div>
            </fieldset>
          )}

          {/* 3 · Payment */}
          <fieldset>
            <Legend n={++step} title="Payment" done={filled.payment || method === "card"} />
            {methods.length === 0 ? (
              <p className="notice">
                Online payment opens in a few days.{" "}
                <a className="font-medium underline" href={whatsappLink("Assalam o Alaikum, I’d like to start Reputra.")} target="_blank" rel="noopener">
                  Message Reputra on WhatsApp
                </a>{" "}
                and we’ll switch your plan on today.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pay with">
                  {methods.map((m) => (
                    <label
                      key={m}
                      className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                        method === m ? "border-ink bg-ink text-paper" : "border-control bg-sheet hover:bg-hover"
                      }`}
                    >
                      <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                      {m === "card" ? gateway!.label : METHOD_NAMES[m as keyof typeof METHOD_NAMES]}
                    </label>
                  ))}
                </div>

                {account ? (
                  <div key={method} className="enter mt-4 grid gap-5 rounded-xl border border-edge p-4 sm:p-5">
                    <ol className="grid gap-4 text-sm">
                      <li className="grid gap-2">
                        <span>
                          <span className="font-medium">1.</span> Send exactly <span className="num font-semibold">{formatPKR(price)}</span> from your bank or wallet app to:
                        </span>
                        <dl className="well grid gap-2 p-3.5">
                          <Detail label="Account title" value={account.accountTitle} />
                          <Detail label={account.method === "raast" ? "Raast ID" : account.method === "bank" ? "Account number" : "Number"} value={account.accountNumber} copy />
                          {account.bankName && <Detail label="Bank" value={account.bankName} />}
                          {account.iban && <Detail label="IBAN" value={account.iban} copy />}
                        </dl>
                      </li>
                      <li>
                        <span className="font-medium">2.</span> Copy the transaction ID (TID) from the receipt, and paste it below.
                      </li>
                    </ol>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="transactionId">
                          Transaction ID (TID)
                        </label>
                        <input
                          className="input font-mono uppercase placeholder:normal-case"
                          id="transactionId"
                          name="transactionId"
                          defaultValue={v?.transactionId}
                          placeholder="e.g. 8412975530"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="payerName">
                          Sent from <span className="font-normal text-muted">(optional)</span>
                        </label>
                        <input className="input" id="payerName" name="payerName" defaultValue={v?.payerName} placeholder="Account holder’s name" />
                      </div>
                    </div>
                  </div>
                ) : method === "card" ? (
                  <p key="card" className="enter mt-4 flex items-center gap-2 rounded-xl border border-edge p-4 text-sm text-muted">
                    <Lock aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                    You’ll pay on the payment provider’s secure page, then come straight back here.
                  </p>
                ) : null}
              </>
            )}
          </fieldset>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-6">
          <div className="panel p-5">
            <h2 className="font-semibold">Summary</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Line label={`${plan.name} plan · ${interval === "year" ? "1 year" : "1 month"}`} value={formatPKR(price)} />
              {interval === "year" && savings > 0 && <Line label="Yearly saving" value={`−${formatPKR(savings)}`} muted />}
              {isNew && (
                <>
                  <Line label="Acrylic counter stand (QR + tap)" value="Free" muted />
                  <Line label="NFC tap card" value="Free" muted />
                  <Line label="Set up at your counter" value="Free" muted />
                </>
              )}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-edge pt-4">
              <span className="font-medium">Total today</span>
              <CountUp value={price} format="pkr" className="text-xl font-semibold" />
            </div>
            <p className="mt-1 text-sm text-muted">Paid until {formatDay(paidUntil)}</p>

            <div className="mt-5 grid gap-3">
              <FormMessage state={state} />
              <SubmitButton pending={method === "card" ? "Opening payment…" : "Switching your plan on…"} className="btn w-full" disabled={methods.length === 0}>
                {method === "card" ? `Pay ${formatPKR(price)}` : `I’ve sent ${formatPKR(price)}`}
              </SubmitButton>
              <p className="text-xs leading-5 text-muted">
                {method === "card"
                  ? "Cancel any time: plans don’t renew by themselves."
                  : "Your plan switches on straight away. We match the transfer within a few hours; if it never arrived, the plan pauses and we’ll message you."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Legend({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <legend className="mb-4 flex items-center gap-3 text-lg font-semibold">
      <span
        className={`grid size-7 place-items-center rounded-full text-sm transition-colors duration-300 ${done ? "bg-positive text-paper" : "bg-ink text-paper"}`}
        aria-label={done ? "Done" : undefined}
      >
        {done ? <Check key="done" aria-hidden="true" className="pop size-4" strokeWidth={3} /> : <span className="num">{n}</span>}
      </span>
      {title}
    </legend>
  );
}

function Detail({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className="num truncate font-medium">{value}</span>
        {copy && <CopyButton text={value.replace(/\s/g, "")} standalone />}
      </dd>
    </div>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-muted" : ""}>{label}</dt>
      <dd className={`num whitespace-nowrap ${muted ? "text-muted" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
