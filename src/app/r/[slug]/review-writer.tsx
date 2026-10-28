"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, RotateCw } from "lucide-react";
import type { Copy, Lang } from "./copy";
import { glideTo } from "./glide";

type Chips = Record<Lang, string[]>;
type Drafts = { veryShort: string; short: string; medium: string };
type Result = { texts: [string, string, string]; ai: boolean; rating: number; round: number };

const MAX_PICKS = 3;

// Writing the Google review, for a customer who chose Google. They tap what stood out (up to
// three, plus "could be better" picks for 1 to 3 stars) and can add a line; we write it up three
// ways, very short to a bit longer, in their language and from their picks only. They pick one,
// change anything, and one tap copies it and opens Google's review box to paste it into. Every
// word is theirs to keep or change, and nothing is posted for them: Google only takes reviews
// the customer posts themselves.
export function ReviewWriter({
  slug,
  rating,
  lang,
  copy: t,
  chips,
  issues,
  googleHref,
  onBack,
  onLeave,
}: {
  slug: string;
  rating: number;
  lang: Lang;
  copy: Copy;
  chips: Chips;
  issues: Chips;
  googleHref: string;
  onBack: () => void;
  onLeave: () => void;
}) {
  // Picks are kept by position, so switching language keeps them ("g2" = third pick, "b0" = first issue).
  const [picks, setPicks] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [chosen, setChosen] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [needPick, setNeedPick] = useState(false);
  const request = useRef<AbortController | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const stopGlide = useRef<() => void>(() => {});

  const unhappy = rating <= 3;
  // Drafts belong to the stars they were written for; new stars go back to the picks.
  const drafts = result && result.rating === rating ? result : null;
  const words = (list: string[], kind: "g" | "b") => picks.filter((p) => p[0] === kind).map((p) => list[Number(p.slice(1))]).filter(Boolean);

  useEffect(
    () => () => {
      request.current?.abort();
      stopGlide.current();
    },
    [],
  );

  // Coming back from Google with the browser's back button shows this page as it was left.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setCopied(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function toggle(key: string) {
    setNeedPick(false);
    setPicks((now) => (now.includes(key) ? now.filter((k) => k !== key) : now.length < MAX_PICKS ? [...now, key] : now));
  }

  async function write() {
    const good = words(chips[lang], "g");
    const bad = unhappy ? words(issues[lang], "b") : [];
    if (!good.length && !bad.length && !note.trim()) {
      setNeedPick(true);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailed(false);
    setCopyFailed(false);
    requestAnimationFrame(() => (stopGlide.current = glideTo(top.current)));
    try {
      const res = await fetch("/api/review-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, rating, picks: good, issues: bad, note: note.trim(), lang }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: { drafts: Drafts; ai: boolean } = await res.json();
      setResult((r) => ({ texts: [data.drafts.veryShort, data.drafts.short, data.drafts.medium], ai: data.ai, rating, round: (r?.round ?? 0) + 1 }));
      setChosen(1);
      requestAnimationFrame(() => (stopGlide.current = glideTo(top.current)));
    } catch (err) {
      if ((err as Error).name !== "AbortError") setFailed(true);
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }

  function edit(text: string) {
    setResult((r) => (r ? { ...r, texts: r.texts.map((x, i) => (i === chosen ? text : x)) as Result["texts"] } : r));
  }

  // The copy happens inside the tap (phones only allow it there), then Google opens a beat later
  // so the customer sees it worked.
  async function copyAndOpen() {
    const text = drafts?.texts[chosen]?.trim();
    if (!text) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    if (!ok) {
      setCopyFailed(true);
      editor.current?.select();
      return;
    }
    try {
      navigator.vibrate?.(12);
    } catch {}
    onLeave();
    setCopied(true);
    setTimeout(() => window.location.assign(googleHref), 850);
  }

  const showDrafts = Boolean(drafts) && !busy;

  return (
    <div ref={top} className="rv-step-in mt-6 scroll-mt-4">
      <StepHead title={showDrafts ? t.write.title2 : t.write.title} hint={showDrafts ? t.write.hint2 : t.write.hint} back={t.write.back} onBack={onBack} />

      {!showDrafts && !busy && (
        <div className="rv-step-in">
          <ChipGroup label={t.write.title} list={chips[lang]} kind="g" picks={picks} onToggle={toggle} />
          {unhappy && (
            <>
              <p className="mt-5 mb-2.5 text-sm text-(--rv-fg3)">{t.write.issues}</p>
              <ChipGroup label={t.write.issues} list={issues[lang]} kind="b" picks={picks} onToggle={toggle} />
            </>
          )}

          <label htmlFor="rv-extra" className="mt-6 mb-2 block text-sm text-(--rv-fg2)">
            {t.write.extra} <span className="text-(--rv-fg3)">({t.form.optional})</span>
          </label>
          <textarea
            id="rv-extra"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNeedPick(false);
            }}
            className="rv-field"
          />

          {needPick && (
            <p role="alert" className="rv-shake mt-3 text-sm text-(--rv-error)">
              {t.write.need}
            </p>
          )}
          {failed && (
            <p role="alert" className="rv-shake mt-3 text-sm text-(--rv-error)">
              {t.write.failed}
            </p>
          )}

          <button type="button" onClick={write} className="rv-google btn btn-gold mt-5 min-h-14 w-full text-[1.05rem]">
            {failed ? t.write.retry : t.write.go}
          </button>
          <OwnWay href={googleHref} label={t.write.own} onLeave={onLeave} />
        </div>
      )}

      <div>
        {busy && <Writing label={t.write.writing} />}

        {showDrafts && drafts && (
          <div className="relative">
            <div role="radiogroup" aria-label={t.write.title2} className="mt-5 grid gap-3">
              {drafts.texts.map((text, i) => {
                const picked = i === chosen;
                const pick = () => {
                  setChosen(i);
                  setCopyFailed(false);
                };
                return (
                  // Same element whether chosen or not, so switching only lifts it; new drafts replay the entrance.
                  <div
                    key={`${drafts.round}-${i}`}
                    onClick={picked ? undefined : pick}
                    className={`rv-glass rv-draft ${picked ? "is-picked" : ""}`}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <button type="button" role="radio" aria-checked={picked} onClick={pick} className="rv-draft-head">
                      <span>{t.write.versions[i]}</span>
                      <Dot on={picked} />
                    </button>
                    {picked ? <AutoText ref={editor} value={text} onChange={edit} label={t.write.edit} /> : <p className="rv-draft-text">{text}</p>}
                  </div>
                );
              })}
            </div>

            {drafts.ai && (
              <button type="button" onClick={write} className="mx-auto mt-3 flex min-h-11 items-center gap-2 px-3 text-sm text-(--rv-fg2) hover:text-(--rv-fg)">
                <RotateCw aria-hidden="true" className="size-4" strokeWidth={1.9} />
                {t.write.again}
              </button>
            )}

            {/* Floats at the bottom of the screen while the drafts are in view. */}
            <div className="rv-dock">
              <div className="rv-glass rv-dock-inner">
                {copyFailed ? (
                  <>
                    <p role="alert" className="text-sm text-(--rv-error)">
                      {t.write.copyFailed}
                    </p>
                    <a href={googleHref} onClick={onLeave} className="btn btn-gold mt-3 min-h-14 w-full text-[1.05rem]">
                      <GoogleMark />
                      {t.write.openOnly}
                    </a>
                  </>
                ) : (
                  <button type="button" onClick={copyAndOpen} className="rv-google btn btn-gold min-h-14 w-full text-[1.05rem]" aria-live="polite">
                    {copied ? <Check aria-hidden="true" className="rv-pop size-5" strokeWidth={2.5} /> : <GoogleMark />}
                    <span>{copied ? t.write.copied : t.write.copyOpen}</span>
                  </button>
                )}
                <p className="mt-2 text-center text-xs leading-snug text-(--rv-fg2)">{t.write.paste(rating)}</p>
              </div>
            </div>
            <OwnWay href={googleHref} label={t.write.own} onLeave={onLeave} />
          </div>
        )}
      </div>
    </div>
  );
}

export function StepHead({ title, hint, back, onBack }: { title: string; hint?: string; back: string; onBack: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={back}
        className="rv-glass -ms-1 grid size-11 shrink-0 place-items-center rounded-full text-(--rv-fg2) transition-colors hover:text-(--rv-fg)"
      >
        <ArrowLeft aria-hidden="true" className="size-[18px] rtl:rotate-180" strokeWidth={1.9} />
      </button>
      <div className="min-w-0 pt-1.5">
        <h3 key={title} className="rv-word text-lg leading-snug font-semibold tracking-[-0.01em]">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-sm leading-relaxed text-(--rv-fg2)">{hint}</p>}
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

// While the AI writes: three glass cards in the drafts' shape, their lines shimmering.
function Writing({ label }: { label: string }) {
  return (
    <div className="mt-5" aria-busy="true">
      <p role="status" className="rv-word mb-3 text-sm text-(--rv-fg2)">
        {label}
      </p>
      <div className="grid gap-3">
        {[1, 2, 3].map((lines, i) => (
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
function AutoText({ ref, value, onChange, label }: { ref: React.Ref<HTMLTextAreaElement>; value: string; onChange: (v: string) => void; label: string }) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={1000}
      rows={2}
      className="rv-draft-text rv-draft-edit"
    />
  );
}

function Dot({ on = false }: { on?: boolean }) {
  return <span aria-hidden="true" className={`rv-dot ${on ? "is-on" : ""}`} />;
}

function OwnWay({ href, label, onLeave }: { href: string; label: string; onLeave: () => void }) {
  return (
    <a href={href} onClick={onLeave} className="mx-auto mt-2 flex min-h-11 w-fit items-center px-3 text-sm text-(--rv-fg3) underline-offset-4 hover:text-(--rv-fg) hover:underline">
      {label}
    </a>
  );
}

// For browsers without the async clipboard (older Android WebViews inside WhatsApp, Instagram).
function legacyCopy(text: string) {
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
