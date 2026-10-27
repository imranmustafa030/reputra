"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion";

type Format = "int" | "pkr" | "decimal1";

const fmt: Record<Format, (n: number) => string> = {
  int: (n) => Math.round(n).toLocaleString("en-PK"),
  pkr: (n) => `PKR ${Math.round(n).toLocaleString("en-PK")}`,
  decimal1: (n) => n.toFixed(1),
};

// A figure that counts to its value: from 0 the first time it's seen, then from its old value
// whenever it changes (a plan price switching to yearly). The final number is in the HTML from
// the start, so screen readers, search and reduced-motion users get it without waiting.
export function CountUp({ value, format = "int", duration = 0.9, className }: { value: number; format?: Format; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = from.current ?? 0;
    from.current = value;
    if (start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt[format](value);
      return;
    }
    const controls = animate(start, value, {
      duration: start === 0 ? duration : 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        el.textContent = fmt[format](n);
      },
    });
    return () => controls.stop();
  }, [value, format, duration]);

  return (
    <span ref={ref} className={`num ${className ?? ""}`}>
      {fmt[format](value)}
    </span>
  );
}
