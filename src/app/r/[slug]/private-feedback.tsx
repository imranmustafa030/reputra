"use client";

import { useActionState } from "react";
import { sendFeedback } from "@/app/actions/feedback";
import { SubmitButton } from "@/components/form";
import type { Copy } from "./copy";

const field =
  "w-full rounded-xl border border-(--rv-line) bg-(--rv-field) px-4 py-3 text-base text-(--rv-fg) placeholder:text-(--rv-fg3) transition-colors duration-200 focus:border-(--rv-fg3) focus:bg-(--rv-bg) focus:outline-none";

// A note only the owner reads, one of the two ways on after the stars. The review page opens it
// inside the customer's tap (see ReviewFlow.openPrivate: iPhone only shows the keyboard for a
// field focused during the tap), so this renders the form at once and hands its parts back.
// A sent note is answered with a drawn check.
export function PrivateFeedback({
  slug,
  source,
  copy: t,
  formRef,
  boxRef,
  onCancel,
}: {
  slug: string;
  source: string;
  copy: Copy;
  formRef: React.Ref<HTMLFormElement>;
  boxRef: React.Ref<HTMLTextAreaElement>;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(sendFeedback, undefined);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rv-sent rv-glass mt-6 flex items-start gap-4 rounded-[24px] p-5"
      >
        <svg
          viewBox="0 0 40 40"
          className="size-10 shrink-0"
          aria-hidden="true"
        >
          <circle cx="20" cy="20" r="18" className="rv-check-ring" />
          <path d="M12.5 20.5l5 5 10-11" className="rv-check-tick" />
        </svg>
        <div>
          <p className="font-medium">{t.sent}</p>
          <p className="mt-1 text-sm leading-relaxed text-(--rv-fg2)">
            {t.sentNote}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="rv-glass rv-step-in mt-6 grid gap-4 rounded-[24px] p-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="source" value={source} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <div>
        <label htmlFor="message" className="mb-2 block text-sm text-(--rv-fg2)">
          {t.form.message}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          minLength={3}
          maxLength={2000}
          defaultValue={state?.values?.message}
          className={field}
          ref={boxRef}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="fb-name"
            className="mb-2 block text-sm text-(--rv-fg2)"
          >
            {t.form.name}{" "}
            <span className="text-(--rv-fg3)">({t.form.optional})</span>
          </label>
          <input
            id="fb-name"
            name="name"
            autoComplete="name"
            maxLength={80}
            defaultValue={state?.values?.name}
            className={field}
          />
        </div>
        <div>
          <label
            htmlFor="fb-phone"
            className="mb-2 block text-sm text-(--rv-fg2)"
          >
            {t.form.phone}{" "}
            <span className="text-(--rv-fg3)">({t.form.optional})</span>
          </label>
          <input
            id="fb-phone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            defaultValue={state?.values?.phone}
            className={field}
            dir="ltr"
          />
        </div>
      </div>
      {state?.error && (
        <p
          aria-live="polite"
          className="rv-shake text-sm text-[oklch(75%_0.15_27)]"
        >
          {state.error}
        </p>
      )}
      <SubmitButton
        pending={t.form.sending}
        className="btn mt-1 min-h-14 w-full bg-(--rv-fg) text-(--rv-bg)"
      >
        {t.form.send}
      </SubmitButton>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-(--rv-fg3)">{t.form.only}</p>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 shrink-0 text-sm text-(--rv-fg3) hover:text-(--rv-fg)"
        >
          {t.form.cancel}
        </button>
      </div>
    </form>
  );
}
