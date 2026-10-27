"use client";

import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import type { FormState } from "@/lib/form-state";

export function SubmitButton({
  children,
  pending,
  className = "btn",
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  pending: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending || disabled} aria-disabled={status.pending || disabled} name={name} value={value}>
      {status.pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="spin size-4 shrink-0" strokeWidth={2.25} />
          {pending}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return <p aria-live="polite" className="sr-only" />;
  // Keyed on the text, so a repeated error shakes again and a new success rises in.
  const text = state.error ?? state.ok;
  return (
    <p key={text} aria-live="polite" className={`flex items-center gap-1.5 text-sm ${state.error ? "shake text-negative" : "enter text-positive"}`}>
      {state.error ? (
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
      ) : (
        <Check aria-hidden="true" className="pop size-4 shrink-0" strokeWidth={2.5} />
      )}
      {text}
    </p>
  );
}
