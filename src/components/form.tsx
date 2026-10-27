"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

export function SubmitButton({ children, pending, className = "btn" }: { children: React.ReactNode; pending: string; className?: string }) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} aria-disabled={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  return (
    <p aria-live="polite" className={`min-h-[1.5em] text-sm ${state?.error ? "text-danger" : "text-growth"}`}>
      {state?.error ?? state?.ok ?? ""}
    </p>
  );
}
