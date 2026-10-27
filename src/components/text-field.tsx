"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, TriangleAlert } from "lucide-react";
import type { FormState } from "@/lib/form-state";

// A boxed field on the white slip: label above, a 54px box with an amber ring while it's yours,
// a tick inside once a typed answer is valid, and any problem written right under it.
//
// Problems come from three places, in this order: the form (when Continue was pressed with
// something wrong), the server, and the field's own check when you leave it having typed
// something. A problem disappears as soon as you start fixing it.

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  id: string;
  label: string;
  hint?: React.ReactNode;
  check?: (value: string) => string | null;
  /** A problem from the form or the server, and a stamp that changes each time one is issued. */
  error?: string;
  stamp?: number;
  /** A friendly read-back of a valid value, e.g. how a phone number will be dialled. */
  echo?: (value: string) => string | null;
  /** A likely correction, e.g. a mistyped email domain. */
  suggest?: (value: string) => string | null;
  onValue?: (value: string) => void;
  reveal?: boolean;
  /** No tick: on a login a tick confirms nothing. */
  noTick?: boolean;
};

export function TextField({ id, label, hint, check, error: given, stamp = 0, echo, suggest, onValue, reveal, noTick, type = "text", defaultValue, ...input }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(String(defaultValue ?? ""));
  const [left, setLeft] = useState(false);
  const [shown, setShown] = useState(false);
  const [editedAt, setEditedAt] = useState(-1); // the stamp current when the person last typed here

  const own = value.length > 0 ? (check?.(value) ?? null) : null;
  const outside = given && editedAt !== stamp ? given : null;
  const error = outside || (left ? own : null);
  const better = value.length > 0 && !error && suggest ? suggest(value) : null;
  // A likely typo is not a tick: the suggestion is the thing to look at.
  const ok = !noTick && value.length > 0 && !own && !outside && !better;
  const said = ok && echo ? echo(value) : null;

  function set(next: string) {
    setValue(next);
    setEditedAt(stamp);
    onValue?.(next);
  }

  return (
    <div className="tf">
      <label htmlFor={id} className="tf-label">
        {label}
      </label>
      <div className={`tf-box ${error ? "is-bad" : ok ? "is-ok" : ""}`}>
        <input
          ref={ref}
          id={id}
          type={reveal ? (shown ? "text" : "password") : type}
          defaultValue={defaultValue}
          className="tf-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-note`}
          onChange={(e) => set(e.target.value)}
          onBlur={() => setLeft(true)}
          {...input}
        />
        {ok && <Check aria-hidden="true" className="tf-tick pop" strokeWidth={2.75} />}
        {reveal && (
          <button type="button" className="tf-reveal" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
            {shown ? <EyeOff aria-hidden="true" className="size-[18px]" strokeWidth={2} /> : <Eye aria-hidden="true" className="size-[18px]" strokeWidth={2} />}
          </button>
        )}
      </div>
      <p id={`${id}-note`} className="tf-note" aria-live="polite">
        {error ? (
          <span key={`${error}-${stamp}`} className="tf-error shake">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
            {error}
          </span>
        ) : better ? (
          <span className="tf-suggest">
            Did you mean <b>{better}</b>?{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                if (ref.current) ref.current.value = better;
                set(better);
                ref.current?.focus();
              }}
            >
              Use it
            </button>
          </span>
        ) : said ? (
          <span className="tf-echo">{said}</span>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}

// 0–4: length, mixed case, digits and symbols.
export function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return p.length < 8 ? Math.min(s, 1) : Math.max(s, 1);
}

// Common slips in the domains Pakistani owners use. There is no self-service password reset
// yet, so a mistyped login email would lock someone out.
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
};

export function suggestEmail(v: string) {
  const [user, domain] = v.trim().toLowerCase().split("@");
  if (!user || !domain) return null;
  const fixed = DOMAIN_FIXES[domain];
  return fixed ? `${user}@${fixed}` : null;
}

// Checks every field when Continue is pressed. If anything is wrong the request never leaves:
// every problem is marked at once, a line above the button says how many, and the first one
// is scrolled to the middle of the screen and focused. After the server answers, its first
// problem is focused the same way.
export function useFormCheck(checks: Record<string, (v: string) => string | null>, state: FormState) {
  const [mine, setMine] = useState<Record<string, string> | null>(null);
  const [tries, setTries] = useState(0);

  const server = state?.errors ?? (state?.field && state.error ? { [state.field]: state.error } : null);
  // Whichever was issued most recently wins: a new Continue press, or a new server answer.
  const [lastSource, setLastSource] = useState<"mine" | "server">("server");
  const errors = (lastSource === "mine" ? mine : server) ?? {};
  const stamp = tries * 1000 + (state?.n ?? 0);

  useEffect(() => {
    if (!state?.field) return;
    goTo(state.field);
  }, [state]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const found: Record<string, string> = {};
    for (const [name, check] of Object.entries(checks)) {
      const problem = check(String(data.get(name) ?? ""));
      if (problem) found[name] = problem;
    }
    if (Object.keys(found).length) {
      e.preventDefault();
      setMine(found);
      setTries((t) => t + 1);
      setLastSource("mine");
      goTo(Object.keys(found)[0]);
    } else {
      setLastSource("server");
    }
  }

  const count = Object.keys(errors).length;
  return { onSubmit, errors, stamp, summary: count > 1 ? `${count} things to fix above.` : null };
}

function goTo(id: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el?.focus({ preventScroll: true });
  });
}
