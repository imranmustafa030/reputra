"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, ChevronDown, PenLine, RotateCw, Star } from "lucide-react";
import { sendFeedback } from "@/app/actions/feedback";
import { haptic } from "@/lib/haptics";
import { SubmitButton } from "@/components/form";
import type { Copy } from "./copy";

// The steps after the stars, each one a full screen that fits a phone without scrolling:
// what stood out → three drafts → copy and open Google (4 or 5 stars), or the private note
// (1 to 3 stars), then a thank-you. ReviewFlow owns the state and moves between them.

export const MAX_PICKS = 3;

/* ------------------------------------------------------------------ the bar on every step */

export function StepBar({ t, step, of, rating, rtl, onBack }: { t: Copy; step: number; of: number; rating: number; rtl: boolean; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3" dir={rtl ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={onBack}
        aria-label={t.write.back}
        className="rv-glass grid size-11 shrink-0 place-items-center rounded-full text-(--rv-fg2) transition-colors hover:text-(--rv-fg)"
      >
        <ArrowLeft aria-hidden="true" className={`size-[18px] ${rtl ? "rotate-180" : ""}`} strokeWidth={1.9} />
      </button>
      <div className="flex flex-1 justify-center gap-1.5" role="img" aria-label={t.stepOf(step, of)}>
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`rv-seg ${i < step ? "is-on" : ""}`} />
        ))}
      </div>
      <span className="rv-glass flex h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-sm font-semibold tabular-nums" dir="ltr">
        <Star aria-hidden="true" className="size-4 fill-(--color-amber) text-(--color-amber)" strokeWidth={1.5} />
        {rating}
        <span className="sr-only">{t.starName(rating)}</span>
      </span>
    </div>
  );
}

// `spare`: a hint the screen can do without on short phones, so nothing has to scroll.
function StepTitle({ title, hint, rtl, spare }: { title: string; hint?: string; rtl: boolean; spare?: boolean }) {
  return (
    <div className="rv-gap">
      <h2 className={`rv-step-title ${rtl ? "leading-[1.7]" : ""}`}>{title}</h2>
      {hint && <p className={`rv-step-hint ${spare ? "rv-spare" : ""}`}>{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ what stood out */

export function PicksStep({
  t,
  rtl,
  low,
  chips,
  issues,
  picks,
  extra,
  needPick,
  onToggle,
  onExtra,
  onWrite,
  bar,
}: {
  t: Copy;
  rtl: boolean;
  low: boolean; // 1 to 3 stars: "could be better" words as well
  chips: string[] | null; // null while the AI makes them
  issues: string[] | null;
  picks: string[];
  extra: string;
  needPick: boolean;
  onToggle: (key: string) => void;
  onExtra: (v: string) => void;
  onWrite: () => void;
  bar: React.ReactNode;
}) {
  // With "could be better" picks as well, fewer of each, so the screen still fits.
  const good = chips ? (low ? chips.slice(0, 4) : chips.slice(0, 6)) : null;
  return (
    <div className="flex flex-1 flex-col">
      {bar}
      <StepTitle title={t.write.title} hint={t.write.hint} rtl={rtl} />
      {good ? <ChipGroup label={t.write.title} list={good} kind="g" picks={picks} onToggle={onToggle} /> : <ChipsLoading count={low ? 4 : 6} top />}
      {low && (
        <>
          <p className="rv-label mt-5">{t.write.issues}</p>
          {issues ? <ChipGroup label={t.write.issues} list={issues.slice(0, 4)} kind="b" picks={picks} onToggle={onToggle} /> : <ChipsLoading count={4} />}
        </>
      )}
      <label htmlFor="rv-extra" className="rv-label mt-6">
        {t.write.extra} <span className="text-(--rv-fg3)">({t.form.optional})</span>
      </label>
      <input
        id="rv-extra"
        value={extra}
        maxLength={300}
        placeholder={t.write.extraPh}
        onChange={(e) => onExtra(e.target.value)}
        className="rv-field"
        enterKeyHint="go"
        onKeyDown={(e) => e.key === "Enter" && onWrite()}
      />

      <div className="mt-auto pt-5">
        {needPick && (
          <p role="alert" className="rv-problem rv-shake mb-3 justify-center">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            {t.write.need}
          </p>
        )}
        <button type="button" onClick={onWrite} className="rv-cta btn btn-gold min-h-14 w-full text-[1.05rem]">
          {t.write.go}
        </button>
      </div>
    </div>
  );
}

// While the AI makes the words: pill-shaped placeholders in their place, shimmering.
const LOADING_WIDTHS = [128, 112, 140, 96, 120, 104];
function ChipsLoading({ count, top = false }: { count: number; top?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${top ? "mt-4" : ""}`} aria-busy="true" aria-hidden="true">
      {LOADING_WIDTHS.slice(0, count).map((w, i) => (
        <span key={i} className="rv-chip-ghost" style={{ width: w, "--i": i } as React.CSSProperties} />
      ))}
    </div>
  );
}

function ChipGroup({ label, list, kind, picks, onToggle }: { label: string; list: string[]; kind: "g" | "b"; picks: string[]; onToggle: (key: string) => void }) {
  const full = picks.length >= MAX_PICKS;
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${kind === "g" ? "mt-4" : ""}`}>
      {list.map((chip, i) => {
        const key = `${kind}${i}`;
        const on = picks.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={full && !on}
            onClick={() => onToggle(key)}
            className={`rv-chip ${kind === "b" ? "is-issue" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            {on && <Check aria-hidden="true" className="rv-pop size-4 shrink-0" strokeWidth={2.5} />}
            {chip}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ the three drafts */

export type Drafts = { texts: [string, string, string]; ai: boolean; rating: number; round: number };

export function DraftsStep({
  t,
  rtl,
  rating,
  drafts,
  busy,
  failed,
  chosen,
  copied,
  copyFailed,
  googleHref,
  onChoose,
  onEdit,
  onAgain,
  onCopy,
  onLeave,
  bar,
}: {
  t: Copy;
  rtl: boolean;
  rating: number;
  drafts: Drafts | null;
  busy: boolean;
  failed: boolean;
  chosen: number;
  copied: boolean;
  copyFailed: boolean;
  googleHref: string;
  onChoose: (i: number) => void;
  onEdit: (text: string) => void;
  onAgain: () => void;
  onCopy: () => void;
  onLeave: () => void;
  bar: React.ReactNode;
}) {
  const ready = Boolean(drafts) && !busy && !failed;
  return (
    <div className="flex flex-1 flex-col">
      {bar}
      <StepTitle title={t.write.title2} hint={t.write.hint2} spare rtl={rtl} />

      {busy && <Writing label={t.write.writing} />}

      {failed && !busy && (
        <div className="my-auto text-center">
          <p role="alert" className="text-(--rv-fg2)">
            {t.write.failed}
          </p>
          <button type="button" onClick={onAgain} className="btn btn-ghost mx-auto mt-4 min-h-12 px-6">
            {t.write.retry}
          </button>
        </div>
      )}

      {ready && drafts && (
        <div role="radiogroup" aria-label={t.write.title2} className="mt-5 grid gap-2.5">
          {drafts.texts.map((text, i) => {
            const picked = i === chosen;
            return (
              // Same element whether chosen or not, so switching only lifts it; new drafts replay the entrance.
              <div
                key={`${drafts.round}-${i}`}
                onClick={picked ? undefined : () => onChoose(i)}
                className={`rv-glass rv-draft ${picked ? "is-picked" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                {/* Its click (tap, Enter, Space) reaches the card's: one handler, so one choice per tap. */}
                <button type="button" role="radio" aria-checked={picked} className="rv-draft-head">
                  <span>{t.write.versions[i]}</span>
                  <span aria-hidden="true" className={`rv-dot ${picked ? "is-on" : ""}`} />
                </button>
                {picked ? (
                  <>
                    <AutoText value={text} onChange={onEdit} label={t.write.edit} />
                    <p className="rv-edit-hint">
                      <PenLine aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
                      {t.write.editHint}
                    </p>
                  </>
                ) : (
                  <p className="rv-draft-text rv-clamp">{text}</p>
                )}
              </div>
            );
          })}
          {drafts.ai && (
            <button type="button" onClick={onAgain} className="mx-auto -my-1 flex min-h-11 items-center gap-1.5 px-3 text-sm text-(--rv-fg2) hover:text-(--rv-fg)">
              <RotateCw aria-hidden="true" className="size-4" strokeWidth={1.9} />
              {t.write.again}
            </button>
          )}
        </div>
      )}

      {ready && (
        <div className="mt-auto pt-4">
          {copyFailed ? (
            <>
              <p role="alert" className="mb-3 text-center text-sm text-(--rv-error)">
                {t.write.copyFailed}
              </p>
              <a href={googleHref} onClick={onLeave} className="rv-cta btn btn-gold min-h-14 w-full text-[1.05rem]">
                <GoogleMark />
                {t.write.openOnly}
              </a>
            </>
          ) : (
            <button type="button" onClick={onCopy} className="rv-cta btn btn-gold min-h-14 w-full text-[1.05rem]" aria-live="polite">
              {copied ? <Check aria-hidden="true" className="rv-pop size-5" strokeWidth={2.5} /> : <GoogleMark />}
              <span>{copied ? t.write.copied : t.write.copyOpen}</span>
            </button>
          )}
          <p className="mt-2 text-center text-xs leading-snug text-(--rv-fg2)">{t.write.paste(rating)}</p>
        </div>
      )}
    </div>
  );
}

// While the AI writes: three glass cards in the drafts' shape, their lines shimmering.
function Writing({ label }: { label: string }) {
  return (
    <div className="mt-5" aria-busy="true">
      <p role="status" className="rv-word mb-3 text-sm text-(--rv-fg2)">
        {label}
      </p>
      <div className="grid gap-2.5">
        {[1, 3, 2].map((lines, i) => (
          <div key={i} className="rv-glass rv-draft" style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
            <span className="rv-line w-20" />
            {Array.from({ length: lines }, (_, l) => (
              <span key={l} className={`rv-line mt-3 ${l === lines - 1 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// The chosen draft, editable in place; it grows with its text instead of scrolling inside.
function AutoText({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const el = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const box = el.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={el}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={1000}
      rows={2}
      className="rv-draft-text rv-draft-edit"
    />
  );
}

/* ------------------------------------------------------------------ the private note */

export function NoteStep({
  t,
  rtl,
  rating,
  noGoogle,
  slug,
  source,
  showGoogle,
  onSent,
  onGoogle,
  bar,
}: {
  t: Copy;
  rtl: boolean;
  rating: number;
  noGoogle: boolean;
  slug: string;
  source: string;
  showGoogle: boolean;
  onSent: () => void;
  onGoogle: () => void;
  bar: React.ReactNode;
}) {
  // Two taps in the same frame both reach the form before the button turns to "Sending":
  // the second is dropped here, so the owner never gets the same note twice.
  const sending = useRef(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof sendFeedback>>, form: FormData) => {
    let result: Awaited<ReturnType<typeof sendFeedback>> | undefined;
    try {
      result = await sendFeedback(prev, form);
    } finally {
      if (!result?.ok) sending.current = false; // a failed send can be tried again
    }
    if (!result?.ok) haptic("error");
    // Moves on once the action has settled, outside its transition.
    if (result?.ok) setTimeout(onSent, 0);
    return result;
  }, undefined);
  const [empty, setEmpty] = useState(false);
  const [reply, setReply] = useState(Boolean(state?.values?.name || state?.values?.phone));
  const box = useRef<HTMLTextAreaElement>(null);
  const title = rating >= 4 ? t.note.titleHappy : rating === 3 ? t.note.title3 : t.note.title;
  const problem = empty ? t.note.need : state?.error;

  // Our own message instead of the browser's bubble when the note is empty.
  function check(e: React.FormEvent<HTMLFormElement>) {
    if (sending.current) {
      e.preventDefault();
      return;
    }
    if ((box.current?.value.trim().length ?? 0) >= 3) {
      sending.current = true;
      return;
    }
    e.preventDefault();
    setEmpty(true);
    haptic("error");
    box.current?.focus();
  }

  return (
    <form action={action} onSubmit={check} noValidate className="flex flex-1 flex-col">
      {bar}
      <StepTitle title={title} hint={noGoogle ? t.noGoogle : t.form.only} spare={!noGoogle} rtl={rtl} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label htmlFor="message" className="rv-label mt-6">
        {t.form.message}
      </label>
      <textarea
        ref={box}
        id="message"
        name="message"
        rows={4}
        maxLength={2000}
        defaultValue={state?.values?.message}
        onChange={() => empty && setEmpty(false)}
        aria-invalid={Boolean(problem)}
        aria-describedby={problem ? "message-problem" : undefined}
        className="rv-field rv-note-box"
      />
      {problem && (
        <p key={problem} id="message-problem" role="alert" className="rv-problem rv-shake">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
          {problem}
        </p>
      )}

      {/* Name and phone only for someone who wants a reply, so the note itself stays the one thing to do. */}
      <button type="button" onClick={() => setReply((r) => !r)} aria-expanded={reply} className="rv-reply">
        <span>{t.note.reply}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform duration-300 ${reply ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {reply && (
        <div className="rv-reply-fields grid gap-2.5">
          <input name="name" autoComplete="name" maxLength={80} defaultValue={state?.values?.name} placeholder={t.form.name} aria-label={t.form.name} className="rv-field" />
          <input
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            defaultValue={state?.values?.phone}
            placeholder={t.form.phone}
            aria-label={t.form.phone}
            className="rv-field"
            dir={rtl ? "rtl" : "ltr"}
          />
        </div>
      )}

      <div className="mt-auto pt-5">
        <SubmitButton pending={t.form.sending} className="rv-cta btn btn-gold min-h-14 w-full text-[1.05rem]">
          {t.form.send}
        </SubmitButton>
        {showGoogle && (
          <p className="mt-2 text-center text-sm text-(--rv-fg3)">
            {t.note.orGoogle}{" "}
            <button type="button" onClick={onGoogle} className="inline-flex min-h-11 items-center text-(--rv-fg2) underline underline-offset-4 hover:text-(--rv-fg)">
              {t.note.googleLink}
            </button>
          </p>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ thank you */

export function ThanksStep({ t, rtl, kind, name, onAgain }: { t: Copy; rtl: boolean; kind: "google" | "note"; name: string; onAgain: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-14 text-center" role="status">
      <span className="rv-done" aria-hidden="true">
        <span className="rv-halo" />
        <span className="rv-halo" />
        <span className="rv-glass rv-done-disc">
          <svg viewBox="0 0 40 40" className="size-12">
            <circle cx="20" cy="20" r="18" className="rv-check-ring" />
            <path d="M12.5 20.5l5 5 10-11" className="rv-check-tick" />
          </svg>
        </span>
      </span>
      <h2 className={`rv-done-title mt-9 ${rtl ? "leading-[1.6]" : ""}`}>{t.done.title}</h2>
      <p className="rv-done-text mt-3 max-w-[26ch] text-[1.05rem] leading-relaxed text-(--rv-fg2)">{kind === "google" ? t.done.google(name) : t.done.note}</p>
      <p className="rv-done-sign mt-6 flex items-center gap-2 text-sm text-(--rv-fg3)">
        <span aria-hidden="true" className="h-px w-6 bg-(--rv-line)" />
        {name}
        <span aria-hidden="true" className="h-px w-6 bg-(--rv-line)" />
      </p>
      {kind === "google" && (
        <button type="button" onClick={onAgain} className="rv-done-sign btn btn-ghost mt-8 min-h-12 px-5 text-sm">
          <GoogleMark />
          {t.done.again}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

// Google's "G", drawn in the button's ink so it reads as a destination, not a logo sticker.
export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.68-.06-1.34-.17-1.97H12v3.73h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.32 2.97-7.28zM12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22zm-5.6-8.1a6 6 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9zM12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z"
      />
    </svg>
  );
}
