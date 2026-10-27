"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { signup } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form";
import { CountUp } from "@/components/motion/count-up";
import { strength, suggestEmail, TextField, useFormCheck } from "@/components/text-field";
import type { FormState } from "@/lib/form-state";
import { toWhatsAppNumber } from "@/lib/format";

export type PlanOption = { code: string; name: string; tagline: string; monthlyPrice: number };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRENGTH = ["Too short", "Okay", "Good", "Strong", "Very strong"];
// In the order the fields appear, so the first problem is the top-most one.
const CHECKS = {
  business: (v: string) => (!v.trim() ? "Enter your business name." : v.trim().length >= 2 ? null : "Enter the full name."),
  name: (v: string) => (!v.trim() ? "Enter your name." : v.trim().length >= 2 ? null : "Enter your full name."),
  phone: (v: string) => (!v.trim() ? "Enter your WhatsApp number." : toWhatsAppNumber(v) ? null : "Enter a mobile number, e.g. 0300 1234567."),
  email: (v: string) => (!v.trim() ? "Enter your email." : EMAIL.test(v.trim()) ? null : "That doesn’t look like an email address."),
  password: (v: string) => (v.length >= 8 ? null : v ? "Use at least 8 characters." : "Choose a password."),
};

// The sign-up slip: who you are, your login, and a receipt at the foot that always says what
// you'll pay, with the plan changeable right there. One screen, one button.
export function SignupForm({ plan, plans, onBusiness }: { plan: string; plans: PlanOption[]; onBusiness?: (name: string) => void }) {
  const [state, action] = useActionState(async (prev: FormState, form: FormData): Promise<FormState> => {
    const result = await signup(prev, form);
    return result && { ...result, n: (prev?.n ?? 0) + 1 };
  }, undefined);
  const v = state?.values;
  const n = state?.n ?? 0;
  const { onSubmit, errors, stamp, summary } = useFormCheck(CHECKS, state);
  const [picked, setPicked] = useState(v?.plan || plan);
  const [choosing, setChoosing] = useState(false);
  const [password, setPassword] = useState("");
  const level = strength(password);
  const chosen = plans.find((p) => p.code === picked) ?? plans[0];
  const general = state?.error && !state.field ? state.error : null;

  return (
    <form action={action} onSubmit={onSubmit} className="slip-form" noValidate>
      <TextField
        key={`business-${n}`}
        id="business"
        name="business"
        label="Business name"
        autoComplete="organization"
        placeholder="e.g. Bloom Salon"
        defaultValue={v?.business}
        hint="Shown at the top of your review page."
        check={CHECKS.business}
        onValue={onBusiness}
        error={errors.business}
        stamp={stamp}
        autoFocus={!state}
      />
      <div className="slip-pair">
        <TextField
          key={`name-${n}`}
          id="name"
          name="name"
          label="Your name"
          autoComplete="name"
          placeholder="e.g. Hina Raza"
          defaultValue={v?.name}
          check={CHECKS.name}
          error={errors.name}
          stamp={stamp}
        />
        <TextField
          key={`phone-${n}`}
          id="phone"
          name="phone"
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          defaultValue={v?.phone}
          check={CHECKS.phone}
          echo={(x) => {
            const w = toWhatsAppNumber(x);
            return w ? `We’ll message +${w.slice(0, 2)} ${w.slice(2, 5)} ${w.slice(5)}` : null;
          }}
          error={errors.phone}
          stamp={stamp}
        />
      </div>
      <div className="slip-pair">
        <TextField
          key={`email-${n}`}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          label="Email"
          autoComplete="email"
          placeholder="you@business.pk"
          defaultValue={v?.email}
          check={CHECKS.email}
          suggest={suggestEmail}
          error={errors.email}
          stamp={stamp}
        />
        <div>
          <TextField
            key={`password-${n}`}
            id="password"
            name="password"
            label="Password"
            reveal
            noTick
            autoComplete="new-password"
            hint={password ? null : "At least 8 characters."}
            onValue={setPassword}
            check={CHECKS.password}
            error={errors.password}
            stamp={stamp}
          />
          {password && (
            <div className="pw-meter" data-level={level} role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={level} aria-label={`Password strength: ${STRENGTH[level]}`}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={i <= level ? "is-on" : ""} />
              ))}
              <span className="pw-word">{STRENGTH[level]}</span>
            </div>
          )}
        </div>
      </div>

      {/* The receipt: what this costs and what comes with it. The plan is changed here. */}
      <div className="slip-receipt">
        <div className="slip-receipt-row">
          <span>
            <b>{chosen.name} plan</b>, every month
            <button type="button" className="slip-change" onClick={() => setChoosing((c) => !c)} aria-expanded={choosing} aria-controls="plan-options">
              {choosing ? "Done" : "Change"}
            </button>
          </span>
          <b>
            <CountUp value={chosen.monthlyPrice} format="pkr" />
          </b>
        </div>
        <fieldset id="plan-options" className={`slip-plans ${choosing ? "is-open" : ""}`} aria-hidden={!choosing}>
          <legend className="sr-only">Plan</legend>
          <div className="slip-plans-inner">
            {plans.map((p) => (
              <label key={p.code} className={`slip-plan ${picked === p.code ? "is-picked" : ""}`}>
                <input
                  type="radio"
                  name="plan"
                  value={p.code}
                  checked={picked === p.code}
                  onChange={() => setPicked(p.code)}
                  tabIndex={choosing ? 0 : -1}
                  className="sr-only"
                />
                <span className="slip-plan-dot" aria-hidden="true">
                  {picked === p.code && <Check className="pop size-3.5" strokeWidth={3.5} />}
                </span>
                <span className="slip-plan-text">
                  <b>{p.name}</b>
                  <span>{p.tagline}</span>
                </span>
                <span className="slip-plan-price">PKR {p.monthlyPrice.toLocaleString("en-PK")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="slip-receipt-row is-quiet">
          <span>Counter stand, NFC tap card and setup</span>
          <span>Free</span>
        </div>
      </div>

      {(summary || general) && <p className="tf-error shake">{general ?? summary}</p>}
      <SubmitButton pending="Creating your account…" className="slip-go">
        Continue to payment
        <ArrowRight aria-hidden="true" className="slip-go-arrow size-5" strokeWidth={2.25} />
      </SubmitButton>
    </form>
  );
}
