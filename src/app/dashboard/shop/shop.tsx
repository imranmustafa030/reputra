"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowLeft, Minus, Move3d, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { placeOrder } from "@/app/actions/shop";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form";
import { CountUp } from "@/components/motion/count-up";
import { PageHeader } from "@/components/page-header";
import type { AccountView } from "@/lib/billing";
import { whatsappLink } from "@/lib/contact";
import type { FormState } from "@/lib/form-state";
import { METHOD_NAMES } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { cartTotal, describeItems, MAX_QTY, PRODUCTS, productOf, type CartLine, type ProductKind } from "@/lib/shop";
import { ProductStageSkeleton } from "./product-stage-skeleton";

// three.js only loads on this page, and only in the browser.
const ProductStage = dynamic(() => import("./product-stage"), { ssr: false, loading: () => <ProductStageSkeleton className="size-full" /> });

const EXPO = [0.16, 1, 0.3, 1] as const;
const step: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  shown: { opacity: 1, x: 0, transition: { duration: 0.46, ease: EXPO } },
  leave: (dir: number) => ({ opacity: 0, x: dir * -16, transition: { duration: 0.18, ease: "easeIn" } }),
};

type Delivery = { contactName: string; contactPhone: string; address: string; city: string };
type Props = { businessName: string; accounts: AccountView[]; delivery: Delivery };

// The shop in three steps: choose (a turning 3D preview of each item with your name on it,
// quantities beside it), pay (delivery and transfer), done (what happens next).
export function Shop({ businessName, accounts, delivery }: Props) {
  const [view, setView] = useState<"choose" | "pay">("choose");
  const [dir, setDir] = useState(1);
  const [shown, setShown] = useState<ProductKind>("stand");
  const [qty, setQty] = useState<Record<ProductKind, number>>({ stand: 0, card: 0, sticker: 0 });
  const [state, action] = useActionState<FormState, FormData>(placeOrder, undefined);

  const lines: CartLine[] = PRODUCTS.flatMap((p) => (qty[p.kind] > 0 ? [{ kind: p.kind, qty: qty[p.kind] }] : []));
  const total = cartTotal(lines);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  function go(next: "choose" | "pay") {
    setDir(next === "pay" ? 1 : -1);
    setView(next);
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function change(kind: ProductKind, by: number) {
    setShown(kind);
    setQty((q) => ({ ...q, [kind]: Math.max(0, Math.min(MAX_QTY, q[kind] + by)) }));
  }

  if (state?.ok) return <Done reference={state.ok} amount={Number(state.values?.amount ?? total)} items={describeItems(lines)} />;

  return (
    <AnimatePresence mode="wait" custom={dir} initial={false}>
      {view === "choose" ? (
        <motion.div key="choose" custom={dir} variants={step} initial="enter" animate="shown" exit="leave">
          <PageHeader title="Shop" lede="More places to ask: every item opens your review page. Made, delivered and set up by Reputra." />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
            {/* The stage: the chosen item, turning, with the business's name printed on it. */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="shop-stage relative aspect-[4/3.4] overflow-hidden rounded-2xl border border-edge max-lg:aspect-[4/3]">
                <ProductStage product={shown} businessName={businessName} className="size-full" />
                <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-sheet/85 px-3 py-1 text-xs text-muted backdrop-blur-sm">
                  <Move3d aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                  Drag to turn
                </span>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shown}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.36, ease: EXPO } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  className="mt-4"
                  aria-live="polite"
                >
                  <p className="font-medium">{productOf(shown).name}</p>
                  <p className="mt-1 max-w-[58ch] text-sm text-muted">{productOf(shown).detail} Printed with your name and a “Powered by Reputra” mark.</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div>
              <ul className="grid gap-2" aria-label="Items">
                {PRODUCTS.map((p) => {
                  const active = shown === p.kind;
                  return (
                    <li key={p.kind} className="relative">
                      {active && <motion.span layoutId="shop-pick" className="absolute inset-0 rounded-[14px] ring-[1.5px] ring-ink" transition={{ duration: 0.36, ease: EXPO }} />}
                      <div className={`relative flex items-center gap-4 rounded-[14px] border p-4 transition-colors ${active ? "border-transparent bg-sheet" : "border-edge hover:bg-[oklch(98.8%_0.002_85)]"}`}>
                        <button type="button" onClick={() => setShown(p.kind)} className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-[14px]" aria-pressed={active}>
                          <span className="block font-medium">{p.name}</span>
                          <span className="block text-sm text-muted">{p.short}</span>
                          <span className="num mt-1 block text-sm font-medium">{formatPKR(p.price)}</span>
                        </button>
                        <Stepper name={p.name} value={qty[p.kind]} onChange={(by) => change(p.kind, by)} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-2 flex items-start gap-3 rounded-[14px] border border-dashed border-control p-4">
                <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-ink" strokeWidth={1.75} />
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    Your own design
                    <span className="pill pill-notice h-5 px-2 text-[0.6875rem]">Coming soon</span>
                  </p>
                  <p className="mt-0.5 text-muted">
                    Your colours and logo on every item.{" "}
                    <a className="link" href={whatsappLink(`Assalam o Alaikum, I’d like custom-designed items for ${businessName}.`)} target="_blank" rel="noopener">
                      Tell us what you need
                    </a>
                  </p>
                </div>
              </div>

              <div className="panel mt-6 p-5 max-lg:sticky max-lg:bottom-3 max-lg:z-10 max-lg:shadow-[0_8px_30px_oklch(14.5%_0.004_265/0.12)]">
                <AnimatePresence initial={false}>
                  {lines.length > 0 && (
                    <motion.dl
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1, transition: { duration: 0.32, ease: EXPO } }}
                      exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }}
                      className="grid gap-2 overflow-hidden text-sm max-lg:hidden"
                    >
                      {lines.map((l) => (
                        <div key={l.kind} className="flex items-baseline justify-between gap-4 first:pt-0">
                          <dt>
                            {productOf(l.kind).name} <span className="text-muted">× {l.qty}</span>
                          </dt>
                          <dd className="num">{formatPKR(productOf(l.kind).price * l.qty)}</dd>
                        </div>
                      ))}
                      <div className="mb-3" />
                    </motion.dl>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">{count ? `${count} ${count === 1 ? "item" : "items"} · delivery and set-up included` : "Add items to your order"}</p>
                    <CountUp value={total} format="pkr" duration={0.5} className="text-xl font-semibold" />
                  </div>
                  <button type="button" className="btn" disabled={!count} aria-disabled={!count} onClick={() => go("pay")}>
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="pay" custom={dir} variants={step} initial="enter" animate="shown" exit="leave">
          <button type="button" onClick={() => go("choose")} className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Back to the shop
          </button>
          <PageHeader title="Pay and deliver" lede={`${describeItems(lines)} for ${businessName}.`} />
          <PayForm lines={lines} total={total} accounts={accounts} delivery={delivery} action={action} state={state} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// − 0 + : the number rolls up or down as it changes.
function Stepper({ name, value, onChange }: { name: string; value: number; onChange: (by: number) => void }) {
  return (
    <div className="relative z-[1] flex items-center rounded-full border border-control bg-sheet" role="group" aria-label={`${name} quantity`}>
      <button type="button" className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-40" onClick={() => onChange(-1)} disabled={value === 0} aria-label={`One less ${name.toLowerCase()}`}>
        <Minus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
      <span className="relative grid h-10 w-8 place-items-center overflow-hidden" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className={`num font-medium ${value ? "text-ink" : "text-muted"}`}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.24, ease: EXPO } }}
            exit={{ y: -14, opacity: 0, transition: { duration: 0.14 } }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button type="button" className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-40" onClick={() => onChange(1)} disabled={value >= MAX_QTY} aria-label={`One more ${name.toLowerCase()}`}>
        <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function PayForm({
  lines,
  total,
  accounts,
  delivery,
  action,
  state,
}: {
  lines: CartLine[];
  total: number;
  accounts: AccountView[];
  delivery: Delivery;
  action: (form: FormData) => void;
  state: FormState;
}) {
  const v = state?.values;
  const [method, setMethod] = useState(v?.method || accounts[0]?.method || "");
  const account = accounts.find((a) => a.method === method);
  const bad = (field: string) => (state?.field === field ? true : undefined);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {lines.map((l) => (
        <input key={l.kind} type="hidden" name={`qty_${l.kind}`} value={l.qty} />
      ))}
      <div className="grid gap-8">
        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Where should we bring it?</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contactName" label="Contact name" defaultValue={v?.contactName ?? delivery.contactName} autoComplete="name" invalid={bad("contactName")} />
            <Field id="contactPhone" label="Phone" defaultValue={v?.contactPhone ?? delivery.contactPhone} autoComplete="tel" inputMode="tel" placeholder="0300 1234567" invalid={bad("contactPhone")} />
            <div className="sm:col-span-2">
              <Field id="address" label="Address" defaultValue={v?.address ?? delivery.address} autoComplete="street-address" placeholder="Shop 4, Main Boulevard, Gulberg III" invalid={bad("address")} />
            </div>
            <Field id="city" label="City" defaultValue={v?.city ?? delivery.city} autoComplete="address-level2" invalid={bad("city")} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-lg font-semibold">Payment</legend>
          {accounts.length === 0 ? (
            <p className="notice">
              Online orders open in a few days.{" "}
              <a className="font-medium underline" href={whatsappLink(`Assalam o Alaikum, I’d like to order: ${describeItems(lines)}.`)} target="_blank" rel="noopener">
                Message Reputra on WhatsApp
              </a>{" "}
              and we’ll take your order today.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pay with">
                {accounts.map((a) => (
                  <label
                    key={a.method}
                    className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                      method === a.method ? "border-ink bg-ink text-paper" : "border-control bg-sheet hover:bg-hover"
                    }`}
                  >
                    <input type="radio" name="method" value={a.method} checked={method === a.method} onChange={() => setMethod(a.method)} className="sr-only" />
                    {METHOD_NAMES[a.method]}
                  </label>
                ))}
              </div>
              {account && (
                <div key={method} className="enter mt-4 grid gap-5 rounded-xl border border-edge p-4 sm:p-5">
                  <ol className="grid gap-4 text-sm">
                    <li className="grid gap-2">
                      <span>
                        <span className="font-medium">1.</span> Send exactly <span className="num font-semibold">{formatPKR(total)}</span> from your bank or wallet app to:
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
                    <Field id="transactionId" label="Transaction ID (TID)" defaultValue={v?.transactionId} placeholder="e.g. 8412975530" autoComplete="off" mono invalid={bad("transactionId")} />
                    <Field id="payerName" label="Sent from" optional defaultValue={v?.payerName} placeholder="Account holder’s name" />
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-6">
        <div className="panel p-5">
          <h2 className="font-semibold">Your order</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            {lines.map((l) => (
              <div key={l.kind} className="flex items-baseline justify-between gap-4">
                <dt>
                  {productOf(l.kind).name} <span className="text-muted">× {l.qty}</span>
                </dt>
                <dd className="num font-medium whitespace-nowrap">{formatPKR(productOf(l.kind).price * l.qty)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 text-muted">
              <dt>Delivery and set-up</dt>
              <dd>Free</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-edge pt-4">
            <span className="font-medium">Total</span>
            <span className="num text-xl font-semibold">{formatPKR(total)}</span>
          </div>
          <div className="mt-5 grid gap-3">
            {state?.error && (
              <p key={state.error} aria-live="polite" className="shake flex items-start gap-1.5 text-sm text-negative">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
                {state.error}
              </p>
            )}
            <SubmitButton pending="Placing your order…" className="btn w-full" disabled={accounts.length === 0}>
              I’ve sent {formatPKR(total)}
            </SubmitButton>
            <p className="text-xs leading-5 text-muted">We match your transfer within a few hours, then print your items with their own codes and bring them to you.</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Field({
  id,
  label,
  optional,
  mono,
  invalid,
  ...input
}: { id: string; label: string; optional?: boolean; mono?: boolean; invalid?: true } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "name">) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <input className={`input ${mono ? "font-mono uppercase placeholder:normal-case" : ""}`} id={id} name={id} aria-invalid={invalid} required={!optional} {...input} />
    </div>
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

// The order is in: a drawn tick, the receipt, and the three steps that follow.
function Done({ reference, amount, items }: { reference: string; amount: number; items: string }) {
  const next = ["We match your transfer, usually within a few hours.", "We print each item with its own code and your name.", "We bring them to you and set them up."];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EXPO } }} className="mx-auto max-w-[560px] py-6 text-center" role="status">
      <svg aria-hidden="true" viewBox="0 0 56 56" className="mx-auto size-14 text-positive" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <motion.circle cx="28" cy="28" r="25" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.3, transition: { duration: 0.6, ease: EXPO, delay: 0.1 } }} />
        <motion.path d="M18 29l7 7 13-15" initial={{ pathLength: 0 }} animate={{ pathLength: 1, transition: { duration: 0.4, ease: EXPO, delay: 0.45 } }} />
      </svg>
      <h1 className="mt-6 text-[1.75rem] leading-9 font-semibold tracking-[-0.02em]">Order placed</h1>
      <p className="mt-2 text-muted">
        {items} · <span className="num">{formatPKR(amount)}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Receipt <span className="font-mono text-ink">{reference}</span>
      </p>
      <ol className="panel stagger mt-8 grid gap-3 p-5 text-left text-sm">
        {next.map((line, i) => (
          <li key={line} className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-hover text-xs font-medium">{i + 1}</span>
            <span className="pt-0.5">{line}</span>
          </li>
        ))}
      </ol>
      <Link href="/dashboard/links" className="btn mt-8">
        See your items
      </Link>
    </motion.div>
  );
}
