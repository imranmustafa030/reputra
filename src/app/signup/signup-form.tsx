"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/form";

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);

  return (
    <form action={action} className="grid gap-5">
      <div>
        <label className="label" htmlFor="business">Business name</label>
        <input className="input" id="business" name="business" autoComplete="organization" defaultValue={state?.values?.business} placeholder="e.g. Smile Dental Clinic" required />
        <p className="hint">Customers see this on your review page.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input className="input" id="name" name="name" autoComplete="name" defaultValue={state?.values?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="hint">At least 8 characters.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending="Creating your account…" className="btn btn-gold w-full">Create account</SubmitButton>
    </form>
  );
}
