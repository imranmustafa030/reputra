import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryField } from "@/components/entry-field";
import { getPlans } from "@/lib/billing";
import { PLAN_CODES, type PlanCode } from "@/models/Plan";
import { SignupEntry } from "./signup-entry";

export const metadata: Metadata = { title: "Create your account" };

// The website's plan buttons land here with ?plan=basic|pro|business.
export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <EntryField
      tone="ink"
      corner={
        <>
          <span className="hidden sm:inline">Already with us? </span>
          <Link href="/login" className="font-medium underline decoration-current/40 underline-offset-4 hover:decoration-current">
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="entry-slip" aria-busy="true" />}>
        <Entry searchParams={searchParams} />
      </Suspense>
    </EntryField>
  );
}

async function Entry({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const [plan, plans] = await Promise.all([chosenPlan(searchParams), getPlans()]);
  return <SignupEntry plan={plan} plans={plans.map((p) => ({ code: p.code, name: p.name, tagline: p.tagline, monthlyPrice: p.monthlyPrice }))} />;
}

async function chosenPlan(searchParams: PageProps<"/signup">["searchParams"]): Promise<PlanCode> {
  const plan = String((await searchParams).plan ?? "");
  return PLAN_CODES.includes(plan as PlanCode) ? (plan as PlanCode) : "pro";
}
