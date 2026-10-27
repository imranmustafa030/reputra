"use client";

import { useActionState } from "react";
import { savePaymentAccount, savePlanPrice } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form";
import { METHOD_NAMES } from "@/lib/labels";

export function PriceForm({ code, name, monthly, yearly }: { code: string; name: string; monthly: number; yearly: number }) {
  const [state, action] = useActionState(savePlanPrice, undefined);
  return (
    <form action={action} className="well grid items-end gap-3 p-4 sm:grid-cols-[120px_1fr_1fr_auto]">
      <input type="hidden" name="code" value={code} />
      <p className="font-medium sm:pb-2.5">{name}</p>
      <div>
        <label className="label text-muted" htmlFor={`${code}-m`}>
          A month (PKR)
        </label>
        <input className="input num" id={`${code}-m`} name="monthlyPrice" type="number" min={0} step={1} defaultValue={monthly} required />
      </div>
      <div>
        <label className="label text-muted" htmlFor={`${code}-y`}>
          A year (PKR)
        </label>
        <input className="input num" id={`${code}-y`} name="yearlyPrice" type="number" min={0} step={1} defaultValue={yearly} required />
      </div>
      <SubmitButton pending="…" className="btn btn-secondary btn-sm mb-1">
        Save
      </SubmitButton>
      {(state?.ok || state?.error) && (
        <div className="sm:col-span-4">
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}

type Account = { accountTitle: string; accountNumber: string; bankName: string; iban: string; active: boolean; placeholder: boolean };

export function AccountForm({ method, account }: { method: "raast" | "jazzcash" | "easypaisa" | "bank"; account: Account | null }) {
  const [state, action] = useActionState(savePaymentAccount, undefined);
  const bank = method === "bank";
  return (
    <form action={action} className="well grid gap-3 p-4 sm:grid-cols-2">
      <input type="hidden" name="method" value={method} />
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {METHOD_NAMES[method]}
          {(!account || account.placeholder) && <span className="pill pill-notice">Sample details: owners can’t pay here yet</span>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={account?.active ?? true} className="size-4" />
          Show at checkout
        </label>
      </div>
      <div>
        <label className="label text-muted" htmlFor={`${method}-title`}>
          Account title
        </label>
        <input className="input" id={`${method}-title`} name="accountTitle" defaultValue={account?.accountTitle} required />
      </div>
      <div>
        <label className="label text-muted" htmlFor={`${method}-number`}>
          {method === "raast" ? "Raast ID (phone or IBAN)" : bank ? "Account number" : "Wallet number"}
        </label>
        <input className="input num" id={`${method}-number`} name="accountNumber" defaultValue={account?.accountNumber} required />
      </div>
      {bank && (
        <>
          <div>
            <label className="label text-muted" htmlFor="bank-name">
              Bank
            </label>
            <input className="input" id="bank-name" name="bankName" defaultValue={account?.bankName} />
          </div>
          <div>
            <label className="label text-muted" htmlFor="bank-iban">
              IBAN
            </label>
            <input className="input font-mono" id="bank-iban" name="iban" defaultValue={account?.iban} />
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending="Saving…" className="btn btn-secondary btn-sm">
          Save
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
