"use client";

import { useState } from "react";
import { confirmPaymentAction, rejectPaymentAction } from "@/app/actions/admin";
import { Check, X } from "lucide-react";
import { SubmitButton } from "@/components/form";

// Confirm in one tap; reject asks why first, because the owner sees the reason.
// Both are outlined: a column of filled black buttons would out-shout the amounts.
export function PaymentActions({ id, stretch = false }: { id: string; stretch?: boolean }) {
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState<"received" | "rejected" | null>(null);
  const grow = stretch ? "flex-1" : "";

  // Answer the tap at once; the row leaves the queue when the list refreshes a moment later.
  if (done) {
    return (
      <div className={`flex ${stretch ? "" : "justify-end"}`}>
        <span className={`pill pop ${done === "received" ? "pill-positive" : "pill-negative"}`} role="status">
          {done === "received" ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} /> : <X aria-hidden="true" className="size-3.5" strokeWidth={2.5} />}
          {done === "received" ? "Marked received" : "Rejected"}
        </span>
      </div>
    );
  }

  if (rejecting) {
    return (
      <form action={rejectPaymentAction} onSubmit={() => setDone("rejected")} className={`enter flex flex-wrap items-center gap-2 ${stretch ? "" : "justify-end"}`}>
        <input type="hidden" name="id" value={id} />
        <input
          name="note"
          className={`input min-h-9 py-1 text-sm ${stretch ? "w-full" : "h-9 w-56"}`}
          defaultValue="No such transfer received"
          aria-label="Why it was rejected (the owner sees this)"
          autoFocus
        />
        <SubmitButton pending="…" className={`btn btn-danger btn-sm ${grow}`}>
          Reject
        </SubmitButton>
        <button type="button" className={`btn btn-secondary btn-sm ${grow}`} onClick={() => setRejecting(false)}>
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className={`flex gap-2 ${stretch ? "" : "justify-end"}`}>
      <button type="button" className={`btn btn-secondary btn-sm ${grow}`} onClick={() => setRejecting(true)}>
        Reject…
      </button>
      <form action={confirmPaymentAction} onSubmit={() => setDone("received")} className={stretch ? "flex flex-1" : ""}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton pending="…" className={`btn btn-secondary btn-sm ${stretch ? "w-full" : ""}`}>
          Received
        </SubmitButton>
      </form>
    </div>
  );
}
