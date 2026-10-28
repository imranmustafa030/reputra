"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { COPY, LANG_NAMES, LANGS, type Lang } from "./copy";
import { DraftsStep, legacyCopy, MAX_PICKS, NoteStep, PicksStep, StepBar, ThanksStep, type Drafts } from "./steps";

type Props = {
  // slug: what the page reports back with (the item's code, or the old slug); base: the page's own address.
  // chips: the "what stood out" picks, issues: the "could be better" ones, in every language.
  business: { name: string; slug: string; hasGoogleLink: boolean; intro: boolean; base?: string; chips: Record<Lang, string[]>; issues: Record<Lang, string[]> };
  source: string;
  preview?: boolean;
};

type Screen = "rate" | "picks" | "drafts" | "note" | "thanks";

const LANG_KEY = "reputra:lang";

// The language a customer chose last time, read without a flash: Roman Urdu (how most customers
// write on WhatsApp) on the server and for a first visit, their saved choice after that.
function savedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY) as Lang | null;
    return v && LANGS.includes(v) ? v : "roman";
  } catch {
    return "roman";
  }
}
const noSubscribe = () => () => {};

// Light by default; a customer who switched to dark gets dark again next time.
const THEME_KEY = "reputra:theme";
function savedTheme(): "light" | "dark" {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
// Back from Google: phones often reload the page rather than restore it, so the thank-you (and
// the review, for "copy again") is kept for this tab for half an hour.
type Done = { at: number; text: string; rating: number };
const DONE_FOR = 30 * 60_000;
let doneCache: { raw: string | null; value: Done | null } = { raw: null, value: null };
function readDone(key: string): Done | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw !== doneCache.raw) doneCache = { raw, value: raw ? (JSON.parse(raw) as Done) : null };
    return doneCache.value && Date.now() - doneCache.value.at < DONE_FOR ? doneCache.value : null;
  } catch {
    return null;
  }
}

const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r = 34 + (i % 3) * 10;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: i % 2 ? 4 : 6 };
});

// The time the tapped stars get to play (fill, ripple, burst) before the next step comes in.
const ADVANCE_MS = 650;

// The customer's whole visit to Reputra, as full-screen steps that fit a phone without scrolling.
// Stars first (the only screen with the language and theme switches). From 4 stars: what stood
// out → three drafts written from those picks → copy and open Google. From 1 to 3 stars: a private
// note to the owner, with Google still offered as a quieter line under it. Then a thank-you.
// Steps move with the browser's view transitions (the old step recedes, the new one comes
// forward) and each is a history entry, so the phone's back gesture goes back one step.
// The stars are recorded so the owner learns how visits felt.
export function ReviewFlow({ business, source, preview = false }: Props) {
  const stored = useSyncExternalStore(noSubscribe, savedLang, () => "roman" as Lang);
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = picked ?? stored;
  const storedTheme = useSyncExternalStore(noSubscribe, savedTheme, () => "light" as const);
  const [pickedTheme, setPickedTheme] = useState<"light" | "dark" | null>(null);
  const theme = pickedTheme ?? storedTheme;
  const root = useRef<HTMLDivElement>(null);

  const [screenState, setScreen] = useState<Screen | null>(null);
  const [enter, setEnter] = useState<"" | "fwd" | "back">(""); // CSS entrance where view transitions aren't available
  const [ratingState, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [burst, setBurst] = useState(0); // bumps on every tap, replays the ripple
  const [picks, setPicks] = useState<string[]>([]); // by position, so a language switch keeps them ("g2", "b0")
  const [extra, setExtra] = useState("");
  const [needPick, setNeedPick] = useState(false);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [thanks, setThanks] = useState<"google" | "note">("google");
  const sent = useRef(false);
  const latest = useRef(0);
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController | null>(null);
  const t = COPY[lang];
  const rtl = lang === "ur";
  const googleHref = `${business.base ?? `/r/${business.slug}`}/go?s=${source}`;
  const doneKey = `reputra:done:${business.slug}`;
  const restored = useSyncExternalStore(noSubscribe, () => readDone(doneKey), () => null);
  const screen = screenState ?? (restored ? "thanks" : "rate");
  const rating = ratingState || (screenState ? 0 : (restored?.rating ?? 0));
  const happy = rating >= 4;

  // The page's colours live on the server-rendered <main>; point it at the chosen theme.
  useEffect(() => {
    root.current?.closest(".rv-page")?.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setPickedTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  // One rating per tab, sent when the customer acts, leaves, or has settled for a few seconds.
  const flush = useCallback(() => {
    if (sent.current || !latest.current || preview) return;
    sent.current = true;
    try {
      if (sessionStorage.getItem(`reputra:rated:${business.slug}`)) return;
      sessionStorage.setItem(`reputra:rated:${business.slug}`, "1");
    } catch {}
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: business.slug, source, type: "rating", value: latest.current }),
      keepalive: true,
    }).catch(() => {});
  }, [business.slug, source, preview]);

  useEffect(() => {
    if (!rating) return;
    const id = setTimeout(flush, 4000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [rating, flush]);

  // Moves to a step. Forward steps are history entries; the back gesture comes in through popstate.
  const show = useCallback((next: Screen, how: { back?: boolean; push?: boolean } = {}) => {
    const dir = how.back ? "back" : "fwd";
    if (how.push) history.pushState({ rv: next }, "");
    window.scrollTo(0, 0);
    const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (motion && document.startViewTransition) {
      document.documentElement.dataset.rvDir = dir;
      document.startViewTransition(() => flushSync(() => setScreen(next)));
    } else {
      setEnter(motion ? dir : "");
      setScreen(next);
    }
  }, []);

  useEffect(() => {
    history.replaceState({ ...history.state, rv: restored ? "thanks" : "rate" }, "");
    const onPop = (e: PopStateEvent) => show((e.state?.rv as Screen) ?? "rate", { back: true });
    // Coming back from Google with the back button shows the thank-you as it was left.
    const onShow = (e: PageTransitionEvent) => e.persisted && setCopied(false);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onShow);
      clearTimeout(advance.current);
      request.current?.abort();
    };
  }, [show, restored]);

  function choose(n: number, go: boolean) {
    latest.current = n;
    setRating(n);
    setBurst((b) => b + 1);
    try {
      navigator.vibrate?.(n === 5 ? [10, 50, 14] : 10);
    } catch {}
    clearTimeout(advance.current);
    if (!go) return;
    advance.current = setTimeout(() => {
      flush();
      show(n >= 4 && business.hasGoogleLink ? "picks" : "note", { push: true });
    }, ADVANCE_MS);
  }

  function pickLang(next: Lang) {
    setPicked(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      choose(Math.min(5, (rating || 0) + 1), false);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      choose(Math.max(1, (rating || 2) - 1), false);
    }
  }

  function toggle(key: string) {
    setNeedPick(false);
    setPicks((now) => (now.includes(key) ? now.filter((k) => k !== key) : now.length < MAX_PICKS ? [...now, key] : now));
  }

  const words = (list: string[], kind: "g" | "b") => picks.filter((p) => p[0] === kind).map((p) => list[Number(p.slice(1))]).filter(Boolean);

  async function write(again = false) {
    const good = words(business.chips[lang], "g");
    const bad = happy ? [] : words(business.issues[lang], "b");
    if (!good.length && !bad.length && !extra.trim()) {
      setNeedPick(true);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailed(false);
    setCopyFailed(false);
    if (!again) show("drafts", { push: true });
    try {
      const res = await fetch("/api/review-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: business.slug, rating, picks: good, issues: bad, note: extra.trim(), lang }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: { drafts: { veryShort: string; short: string; medium: string }; ai: boolean } = await res.json();
      setDrafts((d) => ({ texts: [data.drafts.veryShort, data.drafts.short, data.drafts.medium], ai: data.ai, rating, round: (d?.round ?? 0) + 1 }));
      setChosen(1);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setFailed(true);
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }

  function edit(text: string) {
    setDrafts((d) => (d ? { ...d, texts: d.texts.map((x, i) => (i === chosen ? text : x)) as Drafts["texts"] } : d));
  }

  // The copy happens inside the tap (phones only allow it there). The thank-you is put in place
  // behind, so coming back from Google lands on it, and Google opens a beat later.
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
      return;
    }
    try {
      navigator.vibrate?.(12);
    } catch {}
    flush();
    setCopied(true);
    try {
      sessionStorage.setItem(doneKey, JSON.stringify({ at: Date.now(), text, rating }));
    } catch {}
    setTimeout(() => {
      setThanks("google");
      setScreen("thanks");
      history.replaceState({ ...history.state, rv: "thanks" }, "");
      // A full page load on purpose: /go counts the tap and redirects off-site to Google.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(googleHref);
    }, 750);
  }

  function noteSent() {
    setThanks("note");
    show("thanks");
    history.replaceState({ ...history.state, rv: "thanks" }, "");
  }

  const back = () => history.back();
  const shown = hover || rating;
  const bar = (step: number, of: number) => <StepBar t={t} step={step} of={of} rating={rating} rtl={rtl} onBack={back} />;

  return (
    <div
      ref={root}
      className={`relative isolate flex flex-1 flex-col ${business.intro ? "rv-with-intro" : ""} ${rtl ? "font-urdu" : ""}`}
      dir={rtl ? "rtl" : "ltr"}
      lang={lang === "ur" ? "ur" : lang === "roman" ? "ur-Latn" : "en"}
      style={{ "--rv-glow": screen === "thanks" ? 1 : rating / 5 } as React.CSSProperties}
    >
      {/* The warm light the glass floats over; it brightens with the stars. */}
      <div className="rv-ambient" aria-hidden="true" />

      <div key={screen} className={`rv-screen flex flex-1 flex-col ${enter ? `rv-enter-${enter}` : ""} ${screen === "rate" ? "" : "rv-step"}`}>
        {screen === "rate" && (
          <>
            <div className="rv-in flex items-center justify-end gap-2" style={{ "--d": "0ms" } as React.CSSProperties} dir="ltr">
              <div className="rv-glass flex gap-1 rounded-full p-1" role="group" aria-label="Language">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => pickLang(l)}
                    aria-pressed={lang === l}
                    className={`min-h-9 rounded-full px-3 text-[13px] transition-colors duration-200 ${l === "ur" ? "font-urdu" : ""} ${
                      lang === l ? "bg-(--rv-fg) text-(--rv-bg)" : "text-(--rv-fg3) hover:text-(--rv-fg)"
                    }`}
                  >
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="rv-glass grid size-11 place-items-center rounded-full text-(--rv-fg2) transition-colors hover:text-(--rv-fg)"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={theme === "dark"}
              >
                {theme === "dark" ? <Sun aria-hidden="true" className="size-4" strokeWidth={1.9} /> : <Moon aria-hidden="true" className="size-4" strokeWidth={1.9} />}
              </button>
            </div>

            <div className="rv-layout">
              {/* Who the customer is thanking, large: on wide screens it holds the left half. */}
              <h1 className="rv-head rv-in" style={{ "--d": "60ms", "--len": Math.max(business.name.length + t.thanks.length, 30) } as React.CSSProperties}>
                <span className="rv-thanks">{t.thanks} </span>
                <span className="rv-name">{business.name}</span>
              </h1>

              <section className="rv-panel" aria-labelledby="rv-question">
                <h2 id="rv-question" className={`rv-question rv-in ${rtl ? "leading-loose" : ""}`} style={{ "--d": "160ms" } as React.CSSProperties}>
                  {t.question}
                </h2>

                <div className="relative mt-8" dir="ltr">
                  <div role="radiogroup" aria-label={t.question} className="relative flex justify-between gap-1" onMouseLeave={() => setHover(0)} onKeyDown={onKey}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const on = n <= shown;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${t.starName(n)}: ${t.labels[n - 1]}`}
                          tabIndex={rating ? (rating === n ? 0 : -1) : n === 1 ? 0 : -1}
                          onClick={() => choose(n, true)}
                          onMouseEnter={() => setHover(n)}
                          className={`rv-star rv-in ${on ? "is-on" : ""} ${rating && n <= rating ? "is-set" : ""} ${hover && !rating ? "is-preview" : ""}`}
                          style={{ "--d": `${220 + n * 60}ms`, "--k": `${(n - 1) * 45}ms` } as React.CSSProperties}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" />
                          </svg>
                          {rating === n && (
                            <span key={burst} aria-hidden="true">
                              <span className="rv-ring" />
                              {n === 5 &&
                                SPARKS.map((s, i) => (
                                  <span
                                    key={i}
                                    className="rv-spark"
                                    style={{ "--x": `${s.x}px`, "--y": `${s.y}px`, "--s": `${s.s}px`, "--sd": `${i * 12}ms` } as React.CSSProperties}
                                  />
                                ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className={`mt-4 min-h-8 text-center ${rtl ? "text-xl" : "text-lg"}`} aria-live="polite">
                  <span key={`${lang}-${shown}`} className={`rv-word inline-block ${shown ? "font-medium text-(--rv-word)" : "text-(--rv-fg3)"}`}>
                    {shown ? t.labels[shown - 1] : t.hint}
                  </span>
                </p>

                {/* Straight to Google, for people who don't want to rate here first. */}
                {business.hasGoogleLink && (
                  <a
                    href={googleHref}
                    className="rv-in mx-auto mt-6 flex min-h-11 w-fit items-center gap-1.5 text-sm text-(--rv-fg3) underline-offset-4 hover:text-(--rv-fg) hover:underline"
                    style={{ "--d": "700ms" } as React.CSSProperties}
                  >
                    {t.skip}
                    <ArrowRight aria-hidden="true" className={`size-4 ${rtl ? "rotate-180" : ""}`} strokeWidth={1.75} />
                  </a>
                )}
              </section>
            </div>
          </>
        )}

        {screen === "picks" && (
          <PicksStep
            t={t}
            rtl={rtl}
            chips={business.chips[lang]}
            issues={happy ? null : business.issues[lang]}
            picks={picks}
            extra={extra}
            needPick={needPick}
            onToggle={toggle}
            onExtra={(v) => {
              setExtra(v);
              setNeedPick(false);
            }}
            onWrite={() => write()}
            bar={bar(2, 3)}
          />
        )}

        {screen === "drafts" && (
          <DraftsStep
            t={t}
            rtl={rtl}
            rating={rating}
            drafts={drafts}
            busy={busy}
            failed={failed}
            chosen={chosen}
            copied={copied}
            copyFailed={copyFailed}
            googleHref={googleHref}
            onChoose={(i) => {
              setChosen(i);
              setCopyFailed(false);
            }}
            onEdit={edit}
            onAgain={() => write(true)}
            onCopy={copyAndOpen}
            onLeave={flush}
            bar={bar(3, 3)}
          />
        )}

        {screen === "note" && (
          <NoteStep
            t={t}
            rtl={rtl}
            rating={rating}
            noGoogle={!business.hasGoogleLink}
            slug={business.slug}
            source={source}
            showGoogle={business.hasGoogleLink}
            onSent={noteSent}
            onGoogle={() => show("picks", { push: true })}
            bar={bar(2, 2)}
          />
        )}

        {screen === "thanks" && (
          <ThanksStep
            t={t}
            rtl={rtl}
            kind={thanks}
            name={business.name}
            onAgain={() => {
              const text = drafts?.texts[chosen]?.trim() || restored?.text;
              if (text) navigator.clipboard?.writeText(text).catch(() => legacyCopy(text));
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign(googleHref);
            }}
          />
        )}
      </div>
    </div>
  );
}
