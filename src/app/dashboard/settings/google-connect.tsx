"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Check, LoaderCircle, MapPin, Search, TriangleAlert } from "lucide-react";
import { connectFoundPlace, disconnectGoogle } from "@/app/actions/google";
import type { GooglePlace } from "@/lib/google";

type Suggestion = { id: string; name: string; address: string };
type Mode = "find" | "paste";

// The Google row of Settings. Two ways in, one result (the review link the page's button opens):
// connect the business on Google (search by name, or sign in with Google), or paste a link.
// The link always travels in the settings form as `googleReviewUrl`, so Save never loses it.
export function GoogleConnect({
  url,
  place,
  search,
  account,
}: {
  url: string;
  place: GooglePlace | null;
  search: boolean; // Places API key set
  account: boolean; // Google sign-in set up
}) {
  const canConnect = search || account;
  const [connected, setConnected] = useState(place);
  const [link, setLink] = useState(url);
  const [mode, setMode] = useState<Mode>(canConnect && !(url && !place) ? "find" : "paste");
  const [changing, setChanging] = useState(false);
  const [pending, startTransition] = useTransition();

  if (connected && !changing) {
    return (
      <>
        <input type="hidden" name="googleReviewUrl" value={link} />
        <div className="panel flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-positive-wash text-positive-ink">
            <MapPin aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {connected.name}
              <span className="pill pill-positive">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                Connected
              </span>
            </p>
            {connected.address && <p className="mt-0.5 text-sm text-muted">{connected.address}</p>}
            <p className="mt-1 text-[0.8125rem] text-faint">{connected.via === "account" ? "From your Google account" : "Found on Google Maps"}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href={link} target="_blank" rel="noopener" className="link inline-flex items-center gap-1">
            Open your review box
            <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
          </a>
          <button type="button" className="link" onClick={() => setChanging(true)}>
            Change
          </button>
          <button
            type="button"
            className="link text-muted disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await disconnectGoogle();
                setConnected(null);
                setLink("");
                setMode(canConnect ? "find" : "paste");
              })
            }
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Without Google keys, "Connect Google" still shows, switched off and marked Soon. */}
      <div className="segmented mb-4" role="radiogroup" aria-label="How to add your Google link">
        <label className={canConnect ? "" : "cursor-not-allowed opacity-60"} title={canConnect ? undefined : "Coming soon"}>
          <input type="radio" name="googleMode" checked={mode === "find"} onChange={() => setMode("find")} disabled={!canConnect} />
          Connect Google
          {!canConnect && <span className="pill h-[18px] px-1.5 text-[0.6875rem]">Soon</span>}
        </label>
        <label>
          <input type="radio" name="googleMode" checked={mode === "paste"} onChange={() => setMode("paste")} />
          Paste a link
        </label>
      </div>
      {!canConnect && <p className="-mt-1 mb-4 text-sm text-muted">Soon you’ll connect your Google listing in one tap. For now, paste your review link.</p>}

      {mode === "find" ? (
        <>
          <input type="hidden" name="googleReviewUrl" value={link} />
          {search && (
            <PlaceSearch
              onConnected={(p, u) => {
                setConnected(p);
                setLink(u);
                setChanging(false);
              }}
            />
          )}
          {account && (
            <div className={search ? "mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule pt-4" : ""}>
              <a href="/api/google/connect" className="btn btn-secondary btn-sm gap-2">
                <GoogleMark />
                Sign in with Google
              </a>
              <span className="text-sm text-muted">{search ? "Or pick from the businesses you manage on Google." : "Pick from the businesses you manage on Google."}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="label" htmlFor="googleReviewUrl">
            Link
          </label>
          <input
            className="input"
            id="googleReviewUrl"
            name="googleReviewUrl"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://g.page/r/…/review"
          />
          <ol className="mt-3 grid list-decimal gap-1 pl-5 text-sm text-muted marker:text-faint">
            <li>Open Google Maps and find your business.</li>
            <li>Tap “Ask for reviews” or “Share review form” (in your Business Profile).</li>
            <li>Copy the link and paste it here, then Save.</li>
          </ol>
        </>
      )}

      {changing && (
        <button type="button" className="link mt-4 text-sm" onClick={() => setChanging(false)}>
          Keep {connected?.name}
        </button>
      )}
    </>
  );
}

// Type the business name, pick it from Google's suggestions, and it's connected: a combobox.
function PlaceSearch({ onConnected }: { onConnected: (place: GooglePlace, url: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [connecting, startConnecting] = useTransition();
  const session = useRef("");

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inflight = useRef<AbortController>(undefined);

  // Asks Google a quarter second after the owner stops typing; a newer keystroke cancels the older ask.
  function type(value: string) {
    setQuery(value);
    setProblem("");
    clearTimeout(timer.current);
    inflight.current?.abort();
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    session.current ||= crypto.randomUUID();
    setLoading(true);
    timer.current = setTimeout(async () => {
      const controller = (inflight.current = new AbortController());
      try {
        const res = await fetch(`/api/google/places?q=${encodeURIComponent(q)}&t=${session.current}`, { signal: controller.signal });
        const data = await res.json();
        setProblem(
          res.ok
            ? ""
            : res.status === 429
              ? "Too many searches. Wait a few minutes."
              : res.status === 503
                ? "Google search is busy today. Paste your link instead."
                : "Google search isn’t answering. Paste your link instead.",
        );
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // a newer keystroke replaced this search
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function pick(s: Suggestion) {
    setOpen(false);
    setQuery(s.name);
    startConnecting(async () => {
      const result = await connectFoundPlace(s.id, s.name, session.current);
      session.current = ""; // the pick ends this search session
      if (result.ok) onConnected(result.place, result.url);
      else setProblem(result.error);
    });
  }

  const listId = `${id}-list`;
  const showList = open && query.trim().length >= 2 && !connecting;

  return (
    <div>
      <label className="label" htmlFor={`${id}-q`}>
        Find your business on Google
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" strokeWidth={2} />
        <input
          id={`${id}-q`}
          className="input pl-10"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          placeholder="Business name and area, e.g. Alpha Dog Groomers DHA"
          value={query}
          disabled={connecting}
          onChange={(e) => type(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault(); // never submits the settings form
              const s = suggestions[active >= 0 ? active : 0];
              if (showList && s) pick(s);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {(loading || connecting) && (
          <LoaderCircle aria-hidden="true" className="spin absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-faint" strokeWidth={2.25} />
        )}
        {showList && (
          <ul id={listId} role="listbox" className="panel absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-y-auto py-1.5 shadow-lg">
            {suggestions.length === 0 && !loading ? (
              <li className="px-4 py-3 text-sm text-muted">No business found. Add the area or city to the name.</li>
            ) : (
              suggestions.map((s, i) => (
                <li
                  key={s.id}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? "bg-hover" : "hover:bg-hover"}`}
                  onMouseDown={(e) => e.preventDefault()} // keep focus so blur doesn't close the list first
                  onClick={() => pick(s)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)} // a finger scrolling the list leaves no highlight behind
                >
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" strokeWidth={1.75} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.name}</span>
                    {s.address && <span className="block truncate text-[0.8125rem] text-muted">{s.address}</span>}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {problem ? (
        <p className="shake mt-2 flex items-center gap-1.5 text-sm text-negative" aria-live="polite">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
          {problem}
        </p>
      ) : (
        <p className="hint">{connecting ? "Connecting…" : "Pick it from the list and it’s connected. No link to copy."}</p>
      )}
    </div>
  );
}

// Google's "G", in its four colours, as Google's sign-in guidelines ask.
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
