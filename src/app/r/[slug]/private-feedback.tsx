"use client";

import { useActionState, useState } from "react";
import { sendFeedback } from "@/app/actions/feedback";
import { SubmitButton } from "@/components/form";

const field =
  "w-full rounded-xl border border-line-dark bg-paper/5 px-4 py-3 text-base text-paper placeholder:text-paper/35 focus:border-paper/50 focus:outline-none";

export function PrivateFeedback({ slug, source }: { slug: string; source: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(sendFeedback, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="mt-6 rounded-2xl border border-line-dark p-5 leading-relaxed text-paper/80">
        {state.ok}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost mt-3 min-h-14 w-full border-line-dark text-[1.05rem]">
        Tell the owner privately
      </button>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-4 border-t border-line-dark pt-8">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label htmlFor="message" className="mb-2 block text-sm text-paper/70">
          What should the owner know?
        </label>
        <textarea id="message" name="message" rows={4} required minLength={3} maxLength={2000} defaultValue={state?.values?.message} className={field} autoFocus />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fb-name" className="mb-2 block text-sm text-paper/70">
            Your name <span className="text-paper/40">(optional)</span>
          </label>
          <input id="fb-name" name="name" autoComplete="name" maxLength={80} defaultValue={state?.values?.name} className={field} />
        </div>
        <div>
          <label htmlFor="fb-phone" className="mb-2 block text-sm text-paper/70">
            Phone, for a reply <span className="text-paper/40">(optional)</span>
          </label>
          <input id="fb-phone" name="phone" inputMode="tel" autoComplete="tel" maxLength={30} defaultValue={state?.values?.phone} className={field} />
        </div>
      </div>
      {state?.error && (
        <p aria-live="polite" className="text-sm text-[oklch(75%_0.15_27)]">
          {state.error}
        </p>
      )}
      <SubmitButton pending="Sending…" className="btn mt-1 min-h-14 w-full bg-paper text-ink">
        Send to the owner
      </SubmitButton>
      <p className="text-center text-xs text-paper/40">Only the owner sees this. It is not posted anywhere.</p>
    </form>
  );
}
