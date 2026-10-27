"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/form";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending="Logging in…" className="btn w-full">Log in</SubmitButton>
    </form>
  );
}
