import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { movePack } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import type { PackRow, PaymentRow } from "@/lib/admin";
import { formatDay, formatPhone, formatWhen, METHOD_NAMES, PACK_LABEL, PACK_STEPS, PAYMENT_STATUS } from "@/lib/labels";
import { formatPKR } from "@/lib/plans";
import { PaymentActions } from "./payment-actions";

// Below 640px the admin tables become stacked rows: who and how much on the first line,
// the detail on the second, and the row's action at full touch size underneath.

export function PaymentStack({ rows }: { rows: PaymentRow[] }) {
  return (
    <ul className="stagger sm:hidden">
      {rows.map((p, i) => {
        const s = PAYMENT_STATUS[p.status];
        return (
          <li key={p.id} className={`py-4 ${i ? "border-t border-rule" : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/admin/businesses/${p.businessId}`} className="min-w-0 truncate font-medium">
                {p.businessName}
                {p.demo && <span className="pill ml-2">Demo</span>}
              </Link>
              <span className="num shrink-0 font-semibold">{formatPKR(p.amount)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {METHOD_NAMES[p.method]}
              {p.transactionId && <span className="font-mono"> · TID {p.transactionId}</span>}
            </p>
            <p className="text-xs text-muted">
              {p.what} · {formatWhen(p.createdAt)}
            </p>
            <div className="mt-3">
              {p.status === "submitted" ? (
                <PaymentActions id={p.id} stretch />
              ) : (
                <span className={`pill ${s.tone ? `pill-${s.tone}` : ""}`}>{s.label}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PackStack({ rows }: { rows: PackRow[] }) {
  return (
    <ul className="stagger sm:hidden">
      {rows.map((p, i) => {
        const at = PACK_STEPS.findIndex((s) => s.status === p.status);
        const next = at >= 0 ? PACK_STEPS[at + 1] : undefined;
        return (
          <li key={p.id} className={`py-4 ${i ? "border-t border-rule" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <Link href={`/admin/businesses/${p.businessId}`} className="min-w-0 truncate font-medium">
                {p.businessName}
              </Link>
              <span className={`pill ${p.status === "new" ? "pill-amber" : p.status === "installed" ? "pill-positive" : ""}`}>{PACK_LABEL[p.status]}</span>
            </div>
            <p className="mt-1 text-sm">
              {p.address}, {p.city}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {p.contactName} ·
              <a href={`https://wa.me/${p.contactPhone}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-ink">
                <MessageCircle aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {formatPhone(p.contactPhone)}
              </a>
              · {formatDay(p.createdAt)}
            </p>
            {next && (
              <form action={movePack} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="status" value={next.status} />
                <SubmitButton pending="…" className="btn btn-secondary btn-sm w-full">
                  Mark {next.label.toLowerCase()}
                </SubmitButton>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
