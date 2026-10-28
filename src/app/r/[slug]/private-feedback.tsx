"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { sendFeedback } from "@/app/actions/feedback";
import { SubmitButton } from "@/components/form";
import type { Copy } from "./copy";

const field =
  "w-full rounded-xl border border-(--rv-line) bg-(--rv-field) px-4 py-3 text-base text-(--rv-fg) placeholder:text-(--rv-fg3) transition-colors duration-200 focus:border-(--rv-fg3) focus:bg-(--rv-bg) focus:outline-none";

// A note only the owner reads. It opens in place, and a sent note is answered with a drawn check.
export function PrivateFeedback({
  slug,
  source,
  copy: t,
  active,
  onOpen,
}: {
  slug: string;
  source: string;
  copy: Copy;
  active: boolean;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(sendFeedback, undefined);
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // Puts the note's top edge just under the top of the screen, clear of the phone keyboard.
  const place = (smooth: boolean) => {
    const el = form.current;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 16,
      behavior: smooth && !still ? "smooth" : "auto",
    });
  };

  // While the keyboard slides up (iPhone resizes the visible area in steps and scrolls on its
  // own), the note is put back at the top each time, for the first moment after opening.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const until = Date.now() + 1200;
    const onResize = () => Date.now() < until && place(false);
    vv?.addEventListener("resize", onResize);
    return () => vv?.removeEventListener("resize", onResize);
  }, [open]);

  // Opens the note inside the tap itself: iPhone only shows the keyboard for a field focused
  // during the tap. The note renders at full size at once (it fades and rises, it doesn't grow),
  // so its place on the page is known straight away and the scroll lands on it.
  function openNote() {
    flushSync(() => {
      onOpen();
      setOpen(true);
    });
    box.current?.focus({ preventScroll: true });
    place(true);
  }

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rv-sent mt-6 flex items-start gap-4 rounded-2xl border border-(--rv-line) p-5"
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
    <>
      {!open && (
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          onClick={openNote}
          className="btn btn-ghost mt-4 min-h-14 w-full border-(--rv-line) text-[1.05rem]"
        >
          {t.private}
        </button>
      )}
      {open && (
        <form
          ref={form}
          action={action}
          className="rv-note-in mt-6 grid gap-4 border-t border-(--rv-line) pt-6"
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
            <label
              htmlFor="message"
              className="mb-2 block text-sm text-(--rv-fg2)"
            >
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
              ref={box}
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
              onClick={() => setOpen(false)}
              className="min-h-11 shrink-0 text-sm text-(--rv-fg3) hover:text-(--rv-fg)"
            >
              {t.form.cancel}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
