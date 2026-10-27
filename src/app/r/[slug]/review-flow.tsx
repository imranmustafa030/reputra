"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { COPY, LANG_NAMES, LANGS, type Lang } from "./copy";
import { PrivateFeedback } from "./private-feedback";

type Props = {
  business: { name: string; slug: string; hasGoogleLink: boolean };
  source: string;
};

const LANG_KEY = "reputra:lang";

// The language a customer chose last time, read without a flash: English on the server,
// their saved choice on the first client render.
function savedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY) as Lang | null;
    return v && LANGS.includes(v) ? v : "en";
  } catch {
    return "en";
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
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r = 34 + (i % 3) * 10;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: i % 2 ? 4 : 6 };
});

// The customer's whole visit to Reputra: tap the stars, then choose Google or a private note.
// Both choices are shown for every rating, the same way: Google's rules forbid steering only
// happy customers to a review. The stars are recorded so the owner learns how visits felt.
export function ReviewFlow({ business, source }: Props) {
  const stored = useSyncExternalStore(noSubscribe, savedLang, () => "en" as Lang);
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = picked ?? stored;
  const storedTheme = useSyncExternalStore(noSubscribe, savedTheme, () => "light" as const);
  const [pickedTheme, setPickedTheme] = useState<"light" | "dark" | null>(null);
  const theme = pickedTheme ?? storedTheme;
  const root = useRef<HTMLDivElement>(null);

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
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [burst, setBurst] = useState(0); // bumps on every tap, replays the ripple
  const [leaving, setLeaving] = useState(false);
  const sent = useRef(false);
  const latest = useRef(0);
  const t = COPY[lang];

  // One rating per tab, sent when the customer acts, leaves, or has settled for a few seconds.
  const flush = useCallback(() => {
    if (sent.current || !latest.current) return;
    sent.current = true;
    try {
      if (sessionStorage.getItem(`reputra:rated:${business.slug}`)) return;
      sessionStorage.setItem(`reputra:rated:${business.slug}`, "1");
    } catch {}
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: business.slug,
        source,
        type: "rating",
        value: latest.current,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [business.slug, source]);

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

  function choose(n: number) {
    latest.current = n;
    setRating(n);
    setBurst((b) => b + 1);
    try {
      navigator.vibrate?.(n === 5 ? [10, 50, 14] : 10);
    } catch {}
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
      choose(Math.min(5, (rating || 0) + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      choose(Math.max(1, (rating || 2) - 1));
    }
  }

  const shown = hover || rating;
  const rtl = lang === "ur";
  const googleHref = `/r/${business.slug}/go?s=${source}`;

  return (
    <div
      ref={root}
      className={`flex flex-1 flex-col ${rtl ? "font-urdu" : ""}`}
      dir={rtl ? "rtl" : "ltr"}
      lang={lang === "ur" ? "ur" : lang === "roman" ? "ur-Latn" : "en"}
    >
      <div className="rv-in flex items-center justify-end gap-2" style={{ "--d": "0ms" } as React.CSSProperties} dir="ltr">
        <div className="flex gap-1 rounded-full border border-(--rv-line) p-1" role="group" aria-label="Language">
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
          className="grid size-11 place-items-center rounded-full border border-(--rv-line) text-(--rv-fg2) transition-colors hover:text-(--rv-fg)"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" className="size-4" strokeWidth={1.9} />
          ) : (
            <Moon aria-hidden="true" className="size-4" strokeWidth={1.9} />
          )}
        </button>
      </div>

      <div className="rv-layout">
        {/* Who the customer is thanking, large: on wide screens it holds the left half. */}
        <h1
          className="rv-head rv-in"
          style={
            {
              "--d": "60ms",
              "--len": Math.max(business.name.length + t.thanks.length, 30),
            } as React.CSSProperties
          }
        >
          <span className="rv-thanks">{t.thanks} </span>
          <span className="rv-name">{business.name}</span>
        </h1>

        <section className="rv-panel" aria-labelledby="rv-question">
          <h2 id="rv-question" className={`rv-question rv-in ${rtl ? "leading-loose" : ""}`} style={{ "--d": "160ms" } as React.CSSProperties}>
            {t.question}
          </h2>

          {/* Stars */}
          <div className="relative mt-8" dir="ltr">
            <div
              role="radiogroup"
              aria-label={t.question}
              className="relative flex justify-between gap-1"
              onMouseLeave={() => setHover(0)}
              onKeyDown={onKey}
            >
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
                    onClick={() => choose(n)}
                    onMouseEnter={() => setHover(n)}
                    className={`rv-star rv-in ${on ? "is-on" : ""} ${rating && n <= rating ? "is-set" : ""} ${hover && !rating ? "is-preview" : ""}`}
                    style={
                      {
                        "--d": `${220 + n * 60}ms`,
                        "--k": `${(n - 1) * 45}ms`,
                      } as React.CSSProperties
                    }
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
                              style={
                                {
                                  "--x": `${s.x}px`,
                                  "--y": `${s.y}px`,
                                  "--s": `${s.s}px`,
                                  "--sd": `${i * 12}ms`,
                                } as React.CSSProperties
                              }
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
          {!rating && business.hasGoogleLink && (
            <a
              href={googleHref}
              className="rv-in mx-auto mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-(--rv-fg3) underline-offset-4 hover:text-(--rv-fg) hover:underline"
              style={{ "--d": "700ms" } as React.CSSProperties}
            >
              {t.skip}
              <ArrowRight aria-hidden="true" className={`size-4 ${rtl ? "rotate-180" : ""}`} strokeWidth={1.75} />
            </a>
          )}

          {/* The next step, for every rating */}
          <div className={`rv-reveal ${rating ? "is-open" : ""}`} aria-hidden={!rating}>
            <div className="rv-reveal-inner">
              <p className={`mt-8 text-(--rv-fg2) ${rtl ? "text-lg leading-loose" : "text-[1.05rem] leading-relaxed"}`}>
                {business.hasGoogleLink ? (rating >= 4 ? t.happy : t.unhappy) : t.noGoogle}
              </p>
              {business.hasGoogleLink && (
                <>
                  <a
                    href={googleHref}
                    tabIndex={rating ? 0 : -1}
                    onClick={() => {
                      flush();
                      setLeaving(true);
                    }}
                    className="rv-google btn btn-gold mt-6 min-h-14 w-full text-[1.05rem]"
                  >
                    <GoogleMark />
                    <span>{leaving ? t.opening : t.google}</span>
                    <ArrowRight aria-hidden="true" className={`rv-arrow size-5 ${rtl ? "rotate-180" : ""}`} strokeWidth={2} />
                  </a>
                  <p className="mt-2 text-center text-xs text-(--rv-fg3)">{t.googleNote}</p>
                </>
              )}
              <PrivateFeedback slug={business.slug} source={source} copy={t} active={Boolean(rating)} onOpen={flush} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Google's "G", drawn in the button's ink so it reads as a destination, not a logo sticker.
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.68-.06-1.34-.17-1.97H12v3.73h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.32 2.97-7.28zM12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22zm-5.6-8.1a6 6 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9zM12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z"
      />
    </svg>
  );
}
