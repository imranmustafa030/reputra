"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion";

const FROM = 4.1;
const TO = 4.8;

// The login's statement is a rating climbing: a faded 4.1 above a solid 4.8 that counts up
// while the owner logs in, and five stars that fill as it rises. An illustration, labelled so.
export function ClimbingRating() {
  const value = useRef<HTMLSpanElement>(null);
  const stars = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = value.current;
    const row = stars.current;
    if (!el || !row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    row.dataset.n = "4";
    const controls = animate(FROM, TO, {
      duration: 2.4,
      delay: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        el.textContent = n.toFixed(1);
        row.dataset.n = n >= 4.75 ? "5" : "4";
      },
    });
    return () => controls.stop();
  }, []);

  return (
    <figure className="entry-statement" aria-label={`An illustration: a Google rating rising from ${FROM} to ${TO}`}>
      <p className="entry-figure" aria-hidden="true">
        <span className="entry-ink-pale">{FROM.toFixed(1)}</span>
        <span className="entry-ink-strong">
          <span ref={value}>{TO.toFixed(1)}</span>
        </span>
      </p>
      <div ref={stars} className="entry-stars" data-n="5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 24 24" style={{ "--i": i } as React.CSSProperties}>
            <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" />
          </svg>
        ))}
      </div>
      <figcaption className="entry-caption">Ask every happy customer, and the number moves. Log in to see who went on to Google today.</figcaption>
    </figure>
  );
}
