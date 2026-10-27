import Link from "next/link";
import { Suspense } from "react";
import Loading from "./loading";
import { MessageCircle } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { getOverview, listPacks, listPayments } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDay, formatPhone, formatWhen, METHOD_NAMES, PACK_LABEL, PLAN_NAMES } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { CountUp } from "@/components/motion/count-up";
import { PackStack, PaymentStack } from "./mobile-lists";
import { PaymentActions } from "./payment-actions";

// The team's morning screen. Question: "What needs doing today?"
// Its own Suspense boundary, so switching here from another page in the menu streams in place.
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminOverviewContent />
    </Suspense>
  );
}

async function AdminOverviewContent() {
  await requireAdmin();
  const [o, toCheck, packs] = await Promise.all([
    getOverview(),
    listPayments({ status: ["submitted"] }, 5),
    listPacks({ status: ["new", "printing", "on_the_way"] }),
  ]);
  const todo = [
    o.toCheck && `${o.toCheck} ${o.toCheck === 1 ? "payment" : "payments"} to check`,
    o.openPacks && `${o.openPacks} setup ${o.openPacks === 1 ? "pack" : "packs"} to deliver`,
    o.inGrace.length && `${o.inGrace.length} past due`,
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Overview" lede={todo.length ? `${todo.join(", ")}.` : "Nothing waiting. Every payment is checked and every pack delivered."}>
        <Link href="/admin/businesses/new" className="btn btn-sm">
          Add business
        </Link>
      </PageHeader>

      <section aria-label="Totals" className="enter panel mb-6 grid grid-cols-2 lg:grid-cols-4">
        <Kpi label="Paying businesses" value={o.paying} note={`of ${o.total} signed up`} />
        <Kpi label="Monthly revenue" value={o.mrr} money note="yearly plans as a twelfth" border />
        <Kpi label="Collected this month" value={o.collectedThisMonth} money note="confirmed payments" border top />
        <Kpi label="Sent to Google" value={o.googleClicks30d} note="all businesses, 30 days" border top />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6">
          <section aria-labelledby="check-title">
            <SectionTitle action={<Link href="/admin/payments" className="text-sm text-muted hover:text-ink">View all</Link>}>
              <span id="check-title">Payments to check</span>
            </SectionTitle>
            <div className="panel overflow-x-auto px-5 pt-4 pb-1">
              {toCheck.length === 0 ? (
                <p className="pb-4 text-sm text-muted">Every transfer is matched.</p>
              ) : (
                <>
                <PaymentStack rows={toCheck} />
                <table className="tbl hidden min-w-[620px] sm:table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Paid by</th>
                      <th className="r">Amount</th>
                      <th className="r">Action</th>
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {toCheck.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/businesses/${p.businessId}`} className="font-medium hover:underline">
                            {p.businessName}
                          </Link>
                          <span className="block text-xs text-muted">
                            {PLAN_NAMES[p.plan]} · {p.interval === "year" ? "1 year" : "1 month"} · {formatWhen(p.createdAt)}
                          </span>
                        </td>
                        <td>
                          {METHOD_NAMES[p.method]}
                          <span className="block font-mono text-xs text-muted">TID {p.transactionId || "—"}</span>
                        </td>
                        <td className="r num font-medium whitespace-nowrap">{formatPKR(p.amount)}</td>
                        <td className="r">
                          <PaymentActions id={p.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="packs-title">
            <SectionTitle action={<Link href="/admin/setup-packs" className="text-sm text-muted hover:text-ink">View all</Link>}>
              <span id="packs-title">Setup packs to deliver</span>
            </SectionTitle>
            <div className="panel overflow-x-auto px-5 pt-4 pb-1">
              {packs.length === 0 ? (
                <p className="pb-4 text-sm text-muted">Nothing to print or deliver.</p>
              ) : (
                <>
                <PackStack rows={packs.slice(0, 5)} />
                <table className="tbl hidden min-w-[620px] sm:table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Deliver to</th>
                      <th>Ordered</th>
                      <th className="r">Step</th>
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {packs.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.businessName}</td>
                        <td className="max-w-[280px]">
                          <span className="block truncate">
                            {p.address}, {p.city}
                          </span>
                          <span className="block text-xs text-muted">
                            {p.contactName} · {formatPhone(p.contactPhone)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-muted">{formatDay(p.createdAt)}</td>
                        <td className="r">
                          <span className={`pill ${p.status === "new" ? "pill-amber" : ""}`}>{PACK_LABEL[p.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6">
          <PeopleList
            title="Renewals"
            empty="No plan ends in the next 5 days."
            rows={[...o.inGrace, ...o.renewSoon].map((b) => ({
              id: b.id,
              name: b.name,
              meta: b.access.state === "grace" ? `Ended ${formatDay(b.access.paidUntil!)}` : `Ends ${formatDay(b.access.paidUntil!)}`,
              tone: b.access.state === "grace" ? "pill-notice" : "",
              tag: b.access.state === "grace" ? "Due" : `${b.access.daysLeft} d`,
              phone: b.owner.phone,
              text: `Assalam o Alaikum ${b.owner.name}, your Reputra plan for ${b.name} ${b.access.state === "grace" ? "has ended" : "ends soon"}. You can renew from your dashboard.`,
            }))}
          />
          <PeopleList
            title="Signed up, not paid"
            empty="Everyone who signed up has paid."
            rows={o.notPaid.slice(0, 6).map((b) => ({
              id: b.id,
              name: b.name,
              meta: `${b.owner.name} · joined ${formatWhen(b.createdAt)}`,
              phone: b.owner.phone,
              text: `Assalam o Alaikum ${b.owner.name}, this is Reputra. Can we help you finish setting up ${b.name}?`,
            }))}
          />
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, money, note, border, top }: { label: string; value: number; money?: boolean; note: string; border?: boolean; top?: boolean }) {
  return (
    <div className={`px-5 py-4 ${border ? "border-l border-edge" : ""} ${top ? "border-t border-edge lg:border-t-0" : ""} [&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
        <CountUp value={value} format={money ? "pkr" : "int"} />
      </p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>
  );
}

type Person = { id: string; name: string; meta: string; phone: string; text: string; tag?: string; tone?: string };

function PeopleList({ title, rows, empty }: { title: string; rows: Person[]; empty: string }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="panel px-5">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted">{empty}</p>
        ) : (
          <ul>
            {rows.map((r, i) => (
              <li key={r.id} className={`flex min-h-14 items-center gap-3 py-2.5 ${i ? "border-t border-rule" : ""}`}>
                <Link href={`/admin/businesses/${r.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium hover:underline">{r.name}</span>
                  <span className="block truncate text-xs text-muted">{r.meta}</span>
                </Link>
                {r.tag && <span className={`pill ${r.tone ?? ""}`}>{r.tag}</span>}
                {r.phone && (
                  <a
                    href={`https://wa.me/${r.phone}?text=${encodeURIComponent(r.text)}`}
                    target="_blank"
                    rel="noopener"
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-control hover:bg-hover"
                    aria-label={`WhatsApp ${r.name}`}
                    title="Message on WhatsApp"
                  >
                    <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
