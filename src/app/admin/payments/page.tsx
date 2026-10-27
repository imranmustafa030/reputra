import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { listPayments } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDay, METHOD_NAMES, PAYMENT_STATUS, PLAN_NAMES } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { PaymentStack } from "../mobile-lists";
import { PaymentActions } from "../payment-actions";

export const metadata: Metadata = { title: "Payments" };

const VIEWS = {
  check: { label: "To check", status: ["submitted"] },
  paid: { label: "Paid", status: ["confirmed"] },
  rejected: { label: "Not received", status: ["rejected"] },
  all: { label: "All", status: [] as string[] },
} as const;
type View = keyof typeof VIEWS;

// Match each transfer against the bank or wallet app by amount and TID, then mark it.
export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireAdmin();
  const q = await searchParams;
  const view: View = (Object.keys(VIEWS) as View[]).includes(q.view as View) ? (q.view as View) : "check";
  const [payments, waiting] = await Promise.all([
    listPayments({ status: [...VIEWS[view].status] }),
    view === "check" ? null : listPayments({ status: ["submitted"] }),
  ]);
  const toCheck = view === "check" ? payments.length : waiting!.length;
  // Demo accounts are sample data: listed, marked, never added to money totals.
  const total = payments.filter((p) => !p.demo).reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Payments"
        lede={
          view === "check"
            ? toCheck
              ? `${toCheck} ${toCheck === 1 ? "transfer" : "transfers"} to match against the bank and wallet apps. The plans are already on.`
              : "Every transfer is matched."
            : `${payments.length} ${payments.length === 1 ? "payment" : "payments"} · ${formatPKR(total)}`
        }
      />
      <Tabs
        current={view}
        tabs={(Object.keys(VIEWS) as View[]).map((k) => ({
          key: k,
          label: VIEWS[k].label,
          href: k === "check" ? "/admin/payments" : `/admin/payments?view=${k}`,
          count: k === "check" ? toCheck : undefined,
        }))}
      />

      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-control px-5 py-8 text-center text-sm text-muted">No payments here.</p>
      ) : (
        <div className="overflow-x-auto">
          <PaymentStack rows={payments} />
          <table className="tbl hidden min-w-[880px] sm:table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Business</th>
                <th>Receipt</th>
                <th>Paid by</th>
                <th>Plan</th>
                <th className="r">Amount</th>
                <th className="r">{view === "check" ? "Action" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {payments.map((p) => {
                const s = PAYMENT_STATUS[p.status];
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDay(p.createdAt)}</td>
                    <td>
                      <Link href={`/admin/businesses/${p.businessId}`} className="font-medium hover:underline">
                        {p.businessName}
                      </Link>
                      {p.demo && <span className="pill ml-2">Demo</span>}
                      {p.firstPayment && <span className="block text-xs text-muted">First payment · stand and card</span>}
                    </td>
                    <td className="font-mono text-[0.8125rem]">{p.reference}</td>
                    <td>
                      {METHOD_NAMES[p.method]}
                      <span className="block font-mono text-xs text-muted">
                        {p.transactionId ? `TID ${p.transactionId}` : p.provider === "test" ? "test gateway" : "—"}
                        {p.payerName && ` · ${p.payerName}`}
                      </span>
                    </td>
                    <td>
                      {PLAN_NAMES[p.plan]} <span className="text-muted">· {p.interval === "year" ? "year" : "month"}</span>
                    </td>
                    <td className="r num font-medium whitespace-nowrap">{formatPKR(p.amount)}</td>
                    <td className="r">
                      {p.status === "submitted" ? (
                        <PaymentActions id={p.id} />
                      ) : (
                        <>
                          <span className={`pill ${s.tone ? `pill-${s.tone}` : ""}`}>{s.label}</span>
                          {p.reviewNote && <span className="mt-1 block text-xs text-muted">{p.reviewNote}</span>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
