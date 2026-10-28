"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowLeft, Check, PenLine, RotateCw, Star } from "lucide-react";
import { sendFeedback } from "@/app/actions/feedback";
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
function StepTitle({ title, hint, rtl, aside, spare }: { title: string; hint?: string; rtl: boolean; aside?: React.ReactNode; spare?: boolean }) {
  return (
    <div className="rv-gap flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={`rv-step-title ${rtl ? "leading-[1.7]" : ""}`}>{title}</h2>
        {hint && <p className={`mt-1 text-[15px] leading-snug text-(--rv-fg2) ${spare ? "rv-spare" : ""}`}>{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------ what stood out */

export function PicksStep({
  t,
  rtl,
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
  chips: string[];
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
  const good = issues ? chips.slice(0, 5) : chips;
  return (
    <div className="flex flex-1 flex-col">
      {bar}
      <StepTitle title={t.write.title} hint={t.write.hint} rtl={rtl} />
      <ChipGroup label={t.write.title} list={good} kind="g" picks={picks} onToggle={onToggle} />
      {issues && (
        <>
          <p className="mt-5 mb-2.5 text-sm text-(--rv-fg3)">{t.write.issues}</p>
          <ChipGroup label={t.write.issues} list={issues.slice(0, 4)} kind="b" picks={picks} onToggle={onToggle} />
        </>
      )}
      <label htmlFor="rv-extra" className="mt-6 mb-2 block text-sm text-(--rv-fg2)">
        {t.write.extra} <span className="text-(--rv-fg3)">({t.form.optional})</span>
      </label>
      <input id="rv-extra" value={extra} maxLength={300} onChange={(e) => onExtra(e.target.value)} className="rv-field" enterKeyHint="go" onKeyDown={(e) => e.key === "Enter" && onWrite()} />

      <div className="mt-auto pt-5">
        {needPick && (
          <p role="alert" className="rv-shake mb-3 text-center text-sm text-(--rv-error)">
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

function ChipGroup({ label, list, kind, picks, onToggle }: { label: string; list: string[]; kind: "g" | "b"; picks: string[]; onToggle: (key: string) => void }) {
  const full = picks.length >= MAX_PICKS;
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${kind === "g" ? "mt-5" : ""}`}>
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
      <StepTitle
        title={t.write.title2}
        hint={t.write.hint2}
        spare
        rtl={rtl}
        aside={
          ready &&
          drafts?.ai && (
            <button type="button" onClick={onAgain} className="-me-2 flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm text-(--rv-fg2) hover:text-(--rv-fg)">
              <RotateCw aria-hidden="true" className="size-4" strokeWidth={1.9} />
              {t.write.again}
            </button>
          )
        }
      />

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
                <button type="button" role="radio" aria-checked={picked} onClick={() => onChoose(i)} className="rv-draft-head">
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
  happy,
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
  happy: boolean;
  noGoogle: boolean;
  slug: string;
  source: string;
  showGoogle: boolean;
  onSent: () => void;
  onGoogle: () => void;
  bar: React.ReactNode;
}) {
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof sendFeedback>>, form: FormData) => {
    const result = await sendFeedback(prev, form);
    // Moves on once the action has settled, outside its transition.
    if (result?.ok) setTimeout(onSent, 0);
    return result;
  }, undefined);

  return (
    <form action={action} className="flex flex-1 flex-col">
      {bar}
      <StepTitle title={happy ? t.note.titleHappy : t.note.title} hint={noGoogle ? t.noGoogle : t.form.only} rtl={rtl} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label htmlFor="message" className="mt-6 mb-2 block text-sm text-(--rv-fg2)">
        {t.form.message}
      </label>
      <textarea id="message" name="message" rows={4} required minLength={3} maxLength={2000} defaultValue={state?.values?.message} className="rv-field" />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="fb-name" className="mb-2 block truncate text-sm text-(--rv-fg2)">
            {t.form.name}
          </label>
          <input id="fb-name" name="name" autoComplete="name" maxLength={80} defaultValue={state?.values?.name} placeholder={t.form.optional} className="rv-field" />
        </div>
        <div className="min-w-0">
          <label htmlFor="fb-phone" className="mb-2 block truncate text-sm text-(--rv-fg2)">
            {t.form.phone}
          </label>
          <input id="fb-phone" name="phone" inputMode="tel" autoComplete="tel" maxLength={30} defaultValue={state?.values?.phone} placeholder={t.form.optional} className="rv-field" dir={rtl ? "rtl" : "ltr"} />
        </div>
      </div>

      <div className="mt-auto pt-5">
        {state?.error && (
          <p aria-live="polite" className="rv-shake mb-3 text-center text-sm text-(--rv-error)">
            {state.error}
          </p>
        )}
        <SubmitButton pending={t.form.sending} className="rv-cta btn btn-gold min-h-14 w-full text-[1.05rem]">
          {t.form.send}
        </SubmitButton>
        {showGoogle && (
          <p className="mt-3 text-center text-sm text-(--rv-fg3)">
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
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center" role="status">
      <span className="rv-done" aria-hidden="true">
        <span className="rv-halo" />
        <span className="rv-halo" />
        <span className="rv-halo" />
        <span className="rv-glass rv-done-disc">
          <svg viewBox="0 0 40 40" className="size-12">
            <circle cx="20" cy="20" r="18" className="rv-check-ring" />
            <path d="M12.5 20.5l5 5 10-11" className="rv-check-tick" />
          </svg>
        </span>
      </span>
      <h2 className={`rv-done-title mt-10 ${rtl ? "leading-[1.6]" : ""}`}>{t.done.title}</h2>
      <p className="rv-done-text mx-auto mt-3 max-w-[30ch] text-[1.05rem] leading-relaxed text-(--rv-fg2)">{kind === "google" ? t.done.google(name) : t.done.note}</p>
      {kind === "google" && (
        <button type="button" onClick={onAgain} className="rv-done-text btn btn-ghost mt-8 min-h-12 px-5 text-sm">
          <GoogleMark />
          {t.done.again}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

// For browsers without the async clipboard (older Android WebViews inside WhatsApp, Instagram).
export function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {}
  area.remove();
  return ok;
}

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
