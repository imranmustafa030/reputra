import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { PaymentAccount, TRANSFER_METHODS } from "@/models/PaymentAccount";
import { AccountForm, PriceForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

// Prices and where transfers go: the two things that change without a deploy.
export default async function AdminSettingsPage() {
  await requireAdmin();
  await db();
  const [plans, accounts] = await Promise.all([Plan.find().sort({ sortOrder: 1 }).lean(), PaymentAccount.find().lean()]);

  return (
    <>
      <PageHeader title="Settings" lede="Changes show at checkout straight away. Paid periods never change." />

      <Row title="Prices" description="Whole rupees. A year is usually ten months’ price.">
        <div className="grid gap-3">
          {plans.map((p) => (
            <PriceForm key={p.code} code={p.code} name={p.name} monthly={p.monthlyPrice} yearly={p.yearlyPrice} />
          ))}
        </div>
      </Row>

      <Row title="Where owners send money" description="Shown at checkout for each way to pay. Switch one off to hide it." last>
        <div className="grid gap-3">
          {TRANSFER_METHODS.map((m) => {
            const a = accounts.find((x) => x.method === m);
            return (
              <AccountForm
                key={m}
                method={m}
                account={a ? { accountTitle: a.accountTitle, accountNumber: a.accountNumber, bankName: a.bankName, iban: a.iban, active: a.active, placeholder: a.placeholder } : null}
              />
            );
          })}
        </div>
      </Row>
    </>
  );
}

function Row({ title, description, children, last }: { title: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={`grid gap-4 py-7 first-of-type:pt-0 lg:grid-cols-[min(32%,300px)_minmax(0,1fr)] lg:gap-12 ${last ? "" : "border-b border-edge"}`}>
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0 max-w-[760px]">{children}</div>
    </section>
  );
}
