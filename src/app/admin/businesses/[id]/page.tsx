import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle } from "lucide-react";
import { movePack, setBusinessStatus } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { getBusinessDetail } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { getPlans } from "@/lib/billing";
import { ACCESS_LABEL, CATEGORY_NAMES, formatDay, formatPhone, formatWhen, METHOD_NAMES, PACK_LABEL, PACK_STEPS, PAYMENT_STATUS, PLAN_NAMES } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { getStats } from "@/lib/stats";
import type { Category } from "@/models/Business";
import { CountUp } from "@/components/motion/count-up";
import { PaymentActions } from "../../payment-actions";
import { AdminNoteForm, RecordPaymentForm, ResetPasswordForm } from "./business-forms";

export const metadata: Metadata = { title: "Business" };

// Everything about one business on one screen, with every action the team takes on it.
export default async function BusinessPage({ params }: PageProps<"/admin/businesses/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const b = await getBusinessDetail(id);
  if (!b) notFound();
  const [stats, plans] = await Promise.all([getStats(b.id, 30), getPlans()]);
  const status = b.demo ? { label: "Demo account", tone: "" } : b.suspended ? { label: "Paused", tone: "pill-negative" } : ACCESS_LABEL[b.access.state];
  const pack = b.packs.at(-1);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/businesses" className="text-muted hover:text-ink">
          Businesses
        </Link>
      </p>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {b.name}
            <span className={`pill ${status.tone}`}>{status.label}</span>
          </span>
        }
        lede={`${CATEGORY_NAMES[b.category as Category] ?? "Other"} · ${b.city} · joined ${formatDay(b.createdAt)}${b.googleReviewUrl ? "" : " · no Google link yet"}`}
      >
        <a href={`/r/${b.slug}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
          Review page
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        </a>
        <form action={setBusinessStatus}>
          <input type="hidden" name="id" value={b.id} />
          <input type="hidden" name="status" value={b.suspended ? "active" : "suspended"} />
          <SubmitButton pending="…" className={`btn btn-sm ${b.suspended ? "" : "btn-danger"}`}>
            {b.suspended ? "Turn back on" : "Pause account"}
          </SubmitButton>
        </form>
      </PageHeader>

      {b.suspended && (
        <div className="notice notice-negative mb-4">Paused: the owner can’t use the dashboard and the review page shows “not found”.</div>
      )}

      <section aria-label="Last 30 days" className="panel mb-6 grid grid-cols-2 lg:grid-cols-4">
        {[
          ["Opened the page", stats.visits],
          ["Went to Google", stats.googleClicks],
          ["WhatsApp requests", stats.whatsappSent],
          ["Private notes", stats.feedback],
        ].map(([label, value], i) => (
          <div key={label} className={`px-5 py-4 ${i % 2 ? "border-l border-edge" : ""} ${i > 1 ? "border-t border-edge lg:border-t-0 lg:border-l" : ""}`}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold">
              <CountUp value={Number(value)} />
            </p>
            <p className="mt-0.5 text-xs text-muted">last 30 days</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6">
          <section>
            <SectionTitle>Payments</SectionTitle>
            <div className="panel overflow-x-auto px-5 pt-4 pb-1">
              {b.payments.length === 0 ? (
                <p className="pb-4 text-sm text-muted">No payments yet.</p>
              ) : (
                <table className="tbl min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Paid by</th>
                      <th className="r">Amount</th>
                      <th className="r">Status</th>
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {b.payments.map((p) => {
                      const s = PAYMENT_STATUS[p.status];
                      return (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap">
                            {formatDay(p.createdAt)}
                            <span className="block font-mono text-xs text-muted">{p.reference}</span>
                          </td>
                          <td>
                            {PLAN_NAMES[p.plan]} · {p.interval === "year" ? "1 year" : "1 month"}
                            {p.periodEnd && <span className="block text-xs text-muted">to {formatDay(p.periodEnd)}</span>}
                          </td>
                          <td>
                            {METHOD_NAMES[p.method]}
                            {p.transactionId && <span className="block font-mono text-xs text-muted">TID {p.transactionId}</span>}
                          </td>
                          <td className="r num font-medium whitespace-nowrap">{formatPKR(p.amount)}</td>
                          <td className="r">
                            {p.status === "submitted" ? (
                              <PaymentActions id={p.id} />
                            ) : (
                              <span className={`pill ${s.tone ? `pill-${s.tone}` : ""}`}>{s.label}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Record a payment</SectionTitle>
            <div className="panel p-5">
              <RecordPaymentForm businessId={b.id} plans={plans} currentPlan={b.access.plan} />
            </div>
          </section>

          <section>
            <SectionTitle>Stand & card</SectionTitle>
            <div className="panel p-5">
              {pack ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{PACK_LABEL[pack.status]}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {pack.address}, {pack.city} · {pack.contactName}, {formatPhone(pack.contactPhone)}
                      </p>
                    </div>
                    {(() => {
                      const at = PACK_STEPS.findIndex((s) => s.status === pack.status);
                      const next = at >= 0 ? PACK_STEPS[at + 1] : undefined;
                      return next ? (
                        <form action={movePack}>
                          <input type="hidden" name="id" value={pack.id} />
                          <input type="hidden" name="status" value={next.status} />
                          <SubmitButton pending="…" className="btn btn-secondary btn-sm">
                            Mark {next.label.toLowerCase()}
                          </SubmitButton>
                        </form>
                      ) : null;
                    })()}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">No setup pack ordered. It comes with the first payment made at checkout.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6">
          <section>
            <SectionTitle>Owner</SectionTitle>
            <div className="panel grid gap-4 p-5">
              <div>
                <p className="font-medium">{b.owner.name}</p>
                <p className="mt-0.5 text-sm break-all text-muted">{b.owner.email}</p>
                <p className="mt-0.5 text-sm text-muted">
                  Last login {b.owner.lastLoginAt ? formatWhen(b.owner.lastLoginAt) : "never"}
                </p>
              </div>
              {b.owner.phone && (
                <a href={`https://wa.me/${b.owner.phone}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm justify-self-start">
                  <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {formatPhone(b.owner.phone)}
                </a>
              )}
              <div className="border-t border-rule pt-4">
                <ResetPasswordForm userId={b.owner.id} />
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Plan</SectionTitle>
            <dl className="panel grid gap-3 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Plan</dt>
                <dd className="font-medium">{b.access.plan ? `${PLAN_NAMES[b.access.plan]} · ${b.access.interval === "year" ? "yearly" : "monthly"}` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Paid until</dt>
                <dd className="font-medium">{b.access.paidUntil ? formatDay(b.access.paidUntil) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Review page</dt>
                <dd className="min-w-0 truncate font-mono text-[0.8125rem] whitespace-nowrap">/r/{b.slug}</dd>
              </div>
            </dl>
          </section>

          <section>
            <SectionTitle>Team note</SectionTitle>
            <div className="panel p-5">
              <AdminNoteForm businessId={b.id} note={b.adminNote} />
              <p className="mt-2 text-xs text-muted">Only the Reputra team sees this.</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
