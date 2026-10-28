import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { ProductArt } from "@/components/product-art";
import { packSteps, StepTrack } from "@/components/step-track";
import { requirePaidOwner } from "@/lib/auth";
import { whatsappLink } from "@/lib/contact";
import { db } from "@/lib/db";
import { formatDay, PACK_STEPS } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { describeItems, PRODUCTS, productOf, type CartLine } from "@/lib/shop";
import { businessLinks, listItems, type ItemRow } from "@/lib/tags";
import { Payment } from "@/models/Payment";
import { SetupPack } from "@/models/SetupPack";
import { ItemFooter } from "./switch-button";

export const metadata: Metadata = { title: "Your items" };

// The owner's printed items, each a card with its own picture, status and the one number that
// matters (scans and taps in the last 30 days), best first. Then the two links they share
// themselves. No print files here: new and replacement items come from the shop.
export default async function ItemsPage() {
  const { business } = await requirePaidOwner();
  await db();
  const [items, links, pack, checking] = await Promise.all([
    listItems(business.id),
    businessLinks(business.id),
    SetupPack.findOne({ business: business.id, status: { $nin: ["canceled", "installed"] } }).sort({ createdAt: -1 }).lean(),
    Payment.find({ business: business.id, kind: "shop", status: "submitted" }).sort({ createdAt: -1 }).lean(),
  ]);

  const rank = (i: ItemRow) => (i.status === "off" ? 2 : i.packStatus !== "installed" ? 1 : 0);
  const sorted = [...items].sort((a, b) => rank(a) - rank(b) || b.scans - a.scans);
  const working = items.filter((i) => rank(i) === 0);
  const arriving = items.filter((i) => rank(i) === 1).length;
  const scans = working.reduce((n, i) => n + i.scans, 0);
  const top = working.length > 1 && working[0] && sorted[0].scans > 0 && sorted[0].scans > (sorted[1]?.scans ?? 0) ? sorted[0].id : null;
  const cheapest = Math.min(...PRODUCTS.map((p) => p.price));

  const lede = items.length
    ? [`${working.length} working`, arriving ? `${arriving} on the way` : "", `${scans} ${scans === 1 ? "scan or tap" : "scans and taps"} in the last 30 days`].filter(Boolean).join(" · ")
    : "Your stand and card appear here once they’re on their way.";

  return (
    <>
      <PageHeader title="Your items" lede={lede}>
        <Link href="/dashboard/shop" className="btn btn-sm">
          Shop
        </Link>
      </PageHeader>

      {checking.map((o) => (
        <p key={String(o._id)} className="notice mb-4">
          Order <span className="font-mono">{o.reference}</span> · {describeItems(o.items as CartLine[])} · {formatPKR(o.amount)}. We’re matching your
          transfer; printing starts as soon as it’s found.
        </p>
      ))}
      {pack && <StepTrack steps={packSteps(pack.status, PACK_STEPS)} label="Your delivery" className="mb-6" />}

      <section aria-labelledby="items-title">
        <h2 id="items-title" className="sr-only">
          Printed items
        </h2>
        <ul className="stagger grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => (
            <ItemCard key={item.id} item={item} top={item.id === top} />
          ))}
          <li className="flex flex-col rounded-[14px] border border-dashed border-control p-5">
            <p className="font-medium">More places to ask</p>
            <p className="mt-1 text-sm text-muted">A sticker for every table and mirror, a card in each bill folder, another stand for a second counter.</p>
            <Link href="/dashboard/shop" className="btn btn-secondary btn-sm mt-4 self-start">
              Open the shop · from {formatPKR(cheapest)}
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </Link>
            <p className="mt-auto flex items-start gap-2 border-t border-rule pt-4 text-sm text-muted max-sm:mt-5 sm:mt-6">
              <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-ink" strokeWidth={1.75} />
              <span>
                <span className="font-medium text-ink">Your own design</span> is coming soon.{" "}
                <a className="link" href={whatsappLink(`Assalam o Alaikum, I’d like custom-designed items for ${business.name}.`)} target="_blank" rel="noopener">
                  Tell us what you need
                </a>
              </span>
            </p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="links-title" className="mt-10">
        <SectionTitle>
          <span id="links-title">Links you share</span>
        </SectionTitle>
        <div className="panel divide-y divide-rule">
          <LinkRow title="WhatsApp" hint="Ask on WhatsApp adds this for you. Paste it yourself in any chat." url={links.wa} />
          <LinkRow title="Plain link" hint="For your Instagram bio, receipts or email." url={links.plain} />
        </div>
      </section>
    </>
  );
}

function ItemCard({ item, top }: { item: ItemRow; top: boolean }) {
  const p = productOf(item.kind);
  const off = item.status === "off";
  const arriving = !off && item.packStatus !== "installed";
  return (
    <li className={`panel flex flex-col overflow-hidden ${off ? "bg-[oklch(98.6%_0.002_85)]" : ""}`}>
      <div className={`relative grid h-36 place-items-center bg-frame ${off ? "opacity-55 grayscale" : ""}`}>
        <ProductArt kind={item.kind} className="h-28 w-auto" />
        <span className={`pill absolute top-3 left-3 ${off ? "pill-negative" : arriving ? "pill-notice" : "pill-positive"}`}>
          {off ? "Switched off" : arriving ? "On the way" : "Working"}
        </span>
        {top && <span className="pill absolute top-3 right-3 bg-amber-wash text-amber-ink">Most customers</span>}
      </div>
      <div className="flex items-end justify-between gap-4 px-5 pt-4 pb-4">
        <div className="min-w-0">
          <h3 className="font-medium">{p.name}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {p.scan === "qr+nfc" ? "Scan or tap" : "Tap"} · since {formatDay(item.since)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`num text-2xl leading-8 font-semibold tracking-[-0.02em] ${off || arriving ? "text-faint" : ""}`}>{off || arriving ? "—" : item.scans}</p>
          <p className="text-xs text-muted">last 30 days</p>
        </div>
      </div>
      <ItemFooter id={item.id} off={off} name={p.name} code={item.code} />
    </li>
  );
}

function LinkRow({ title, hint, url }: { title: string; hint: string; url: string }) {
  return (
    <div className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:gap-8">
      <div className="min-w-0">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{hint}</p>
      </div>
      <div className="flex min-w-0 items-stretch">
        <code className="flex min-w-0 flex-1 items-center rounded-l-[10px] border border-r-0 border-control bg-frame px-3 font-mono text-[0.8125rem]">
          <span className="min-w-0 truncate">{url}</span>
        </code>
        <CopyButton text={url} />
      </div>
    </div>
  );
}
