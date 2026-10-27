import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { finishTestPayment } from "@/app/actions/checkout";
import { SubmitButton } from "@/components/form";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeGateway } from "@/lib/gateway";
import { formatPKR } from "@/lib/plans";
import { Payment } from "@/models/Payment";

export const metadata: Metadata = { title: "Test payment" };

// Stands in for a real provider's hosted card page while there is no merchant account.
// Only exists when PAYMENT_GATEWAY=test, and never in production unless explicitly allowed.
export default function TestGatewayPage({ searchParams }: PageProps<"/checkout/test-gateway">) {
  return (
    <Suspense>
      <TestGateway searchParams={searchParams} />
    </Suspense>
  );
}

async function TestGateway({ searchParams }: Pick<PageProps<"/checkout/test-gateway">, "searchParams">) {
  if (activeGateway()?.id !== "test") notFound();
  const [{ business }, query] = await Promise.all([requireOwner(), searchParams]);
  await db();
  const ref = String(query.ref ?? "");
  const payment = await Payment.findOne({ reference: ref, business: business.id, status: "pending" }).lean();
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-[440px] pt-6">
      <div className="notice mb-6">Test mode. No real money moves.</div>
      <div className="panel p-6">
        <p className="text-sm text-muted">Pay Reputra</p>
        <p className="num mt-1 text-3xl font-semibold">{formatPKR(payment.amount)}</p>
        <p className="mt-1 font-mono text-sm text-muted">{payment.reference}</p>
        <form action={finishTestPayment} className="mt-6 grid gap-3">
          <input type="hidden" name="ref" value={ref} />
          <SubmitButton pending="Paying…" className="btn w-full" name="outcome" value="paid">
            Pay successfully
          </SubmitButton>
          <SubmitButton pending="…" className="btn btn-secondary w-full" name="outcome" value="failed">
            Decline the card
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
