"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addBusiness } from "@/app/actions/admin";
import { CopyButton } from "@/components/copy-button";
import { FormMessage, SubmitButton } from "@/components/form";
import { CATEGORY_NAMES } from "@/lib/labels";

export function AddBusinessForm() {
  const [state, action] = useActionState(addBusiness, undefined);

  // Created: show the password once, with what to do next.
  if (state?.ok && state.values?.businessId) {
    return (
      <div className="panel max-w-[560px] p-6">
        <p className="font-semibold">Account created</p>
        <p className="mt-1 text-sm text-muted">Give the owner these details. The password is shown only now; you can reset it later from their page.</p>
        <dl className="well mt-4 grid gap-2 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">{state.values.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Password</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono font-medium">{state.ok}</span>
              <CopyButton text={state.ok} standalone />
            </dd>
          </div>
        </dl>
        <Link href={`/admin/businesses/${state.values.businessId}`} className="btn mt-6">
          Record their payment
        </Link>
      </div>
    );
  }

  const v = state?.values;
  return (
    <form action={action} className="panel grid max-w-[720px] gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="business">
          Business name
        </label>
        <input className="input" id="business" name="business" defaultValue={v?.business} required />
      </div>
      <div>
        <label className="label" htmlFor="category">
          Type
        </label>
        <select className="input" id="category" name="category" defaultValue={v?.category ?? "restaurant"}>
          {Object.entries(CATEGORY_NAMES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="city">
          City
        </label>
        <input className="input" id="city" name="city" defaultValue={v?.city ?? "Lahore"} required />
      </div>
      <div className="border-t border-rule pt-4 sm:col-span-2">
        <label className="label" htmlFor="name">
          Owner’s name
        </label>
        <input className="input" id="name" name="name" defaultValue={v?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Owner’s WhatsApp
        </label>
        <input className="input" id="phone" name="phone" inputMode="tel" placeholder="0300 1234567" defaultValue={v?.phone} required />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Owner’s email
        </label>
        <input className="input" id="email" name="email" type="email" defaultValue={v?.email} required />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <SubmitButton pending="Creating…">Create account</SubmitButton>
        <FormMessage state={state?.error ? state : undefined} />
      </div>
    </form>
  );
}
