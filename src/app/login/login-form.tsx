"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { login } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form";
import { suggestEmail, TextField, useFormCheck } from "@/components/text-field";
import { whatsappLink } from "@/lib/contact";
import type { FormState } from "@/lib/form-state";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKS = {
  email: (v: string) => (!v.trim() ? "Enter your email." : EMAIL.test(v.trim()) ? null : "That doesn’t look like an email address."),
  password: (v: string) => (v ? null : "Enter your password."),
};

export function LoginForm() {
  // Every answer from the server is stamped, so the fields remount and show it.
  const [state, action] = useActionState(async (prev: FormState, form: FormData): Promise<FormState> => {
    const result = await login(prev, form);
    return result && { ...result, n: (prev?.n ?? 0) + 1 };
  }, undefined);
  const next = useSearchParams().get("next") ?? "";
  const { onSubmit, errors, stamp } = useFormCheck(CHECKS, state);
  const general = state?.error && !state.field ? state.error : null;
  const n = state?.n ?? 0;

  return (
    <form action={action} onSubmit={onSubmit} className="slip-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <TextField
        key={`email-${n}`}
        id="email"
        name="email"
        type="email"
        label="Email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@business.pk"
        defaultValue={state?.values?.email}
        check={CHECKS.email}
        suggest={suggestEmail}
        error={errors.email}
        stamp={stamp}
        noTick
        autoFocus={!state}
      />
      <TextField
        key={`password-${n}`}
        id="password"
        name="password"
        label="Password"
        reveal
        autoComplete="current-password"
        error={errors.password}
        stamp={stamp}
        noTick
      />
      {general && <p className="tf-error shake">{general}</p>}
      <SubmitButton pending="Logging in…" className="slip-go">
        Log in
        <ArrowRight aria-hidden="true" className="slip-go-arrow size-5" strokeWidth={2.25} />
      </SubmitButton>
      <p className="slip-small">
        Forgot your password?{" "}
        <a href={whatsappLink("Assalam o Alaikum, I can’t log in to Reputra.")} target="_blank" rel="noopener" className="link">
          Message us on WhatsApp
        </a>
      </p>
    </form>
  );
}
