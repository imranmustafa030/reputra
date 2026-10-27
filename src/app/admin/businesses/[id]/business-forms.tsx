"use client";

import { useActionState } from "react";
import { recordPayment, resetOwnerPassword, saveAdminNote } from "@/app/actions/admin";
import { CopyButton } from "@/components/copy-button";
import { FormMessage, SubmitButton } from "@/components/form";
import { formatPKR } from "@/lib/plans";
import type { PlanView } from "@/lib/billing";

// Cash at the counter, or a transfer the owner sent the team directly. Confirmed at once.
export function RecordPaymentForm({ businessId, plans, currentPlan }: { businessId: string; plans: PlanView[]; currentPlan: string | null }) {
  const [state, action] = useActionState(recordPayment, undefined);
  const v = state?.values;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="businessId" value={businessId} />
      <div>
        <label className="label" htmlFor="rp-plan">
          Plan
        </label>
        <select className="input" id="rp-plan" name="plan" defaultValue={v?.plan ?? currentPlan ?? "pro"}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} · {formatPKR(p.monthlyPrice)} a month
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rp-interval">
          Period
        </label>
        <select className="input" id="rp-interval" name="interval" defaultValue={v?.interval ?? "month"}>
          <option value="month">1 month</option>
          <option value="year">1 year (10 months’ price)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rp-method">
          Paid by
        </label>
        <select className="input" id="rp-method" name="method" defaultValue={v?.method ?? "cash"}>
          <option value="cash">Cash</option>
          <option value="raast">Raast</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">Easypaisa</option>
          <option value="bank">Bank transfer</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rp-tid">
          Transaction ID <span className="font-normal text-muted">(if any)</span>
        </label>
        <input className="input font-mono uppercase placeholder:normal-case" id="rp-tid" name="transactionId" defaultValue={v?.transactionId} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton pending="Recording…" className="btn btn-sm">
          Record payment
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetOwnerPassword, undefined);
  if (state?.ok) {
    return (
      <div className="well grid gap-2 p-3 text-sm">
        <span className="text-muted">New password, shown once. Their other devices are logged out.</span>
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono font-medium">{state.ok}</span>
          <CopyButton text={state.ok} standalone />
        </span>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton pending="Resetting…" className="btn btn-secondary btn-sm">
        Reset password
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function AdminNoteForm({ businessId, note }: { businessId: string; note: string }) {
  const [state, action] = useActionState(saveAdminNote, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={businessId} />
      <label className="sr-only" htmlFor="adminNote">
        Team note
      </label>
      <textarea
        className="input min-h-[96px] text-sm"
        id="adminNote"
        name="adminNote"
        defaultValue={state?.values?.adminNote ?? note}
        placeholder="Visited on 12 Oct, wants a second stand for the takeaway counter…"
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending="Saving…" className="btn btn-secondary btn-sm">
          Save note
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
