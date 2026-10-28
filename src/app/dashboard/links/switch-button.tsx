"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { switchItem } from "@/app/actions/shop";
import { SubmitButton } from "@/components/form";

const EXPO = [0.16, 1, 0.3, 1] as const;

// An item card's footer: the code and "Lost it?". Switching off asks once, in place (no browser
// dialog): the whole footer turns into one row, "Switch off this stand? It stops working at
// once." with Keep and Switch off side by side. Switching back on needs no question.
export function ItemFooter({ id, off, name, code }: { id: string; off: boolean; name: string; code: string }) {
  const [asking, setAsking] = useState(false);
  const noun = name.split(" ").pop()!.toLowerCase();

  return (
    <div className="relative mt-auto border-t border-rule">
      <AnimatePresence mode="popLayout" initial={false}>
        {asking && !off ? (
          <motion.form
            key="ask"
            action={switchItem}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EXPO } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-negative-wash/60 px-5 py-3"
            role="group"
            aria-label={`Switch off this ${noun}?`}
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="off" />
            <p className="min-w-[10rem] flex-1 text-sm leading-5">
              <span className="block font-medium text-negative-ink">Switch off this {noun}?</span>
              <span className="text-muted">It stops working at once.</span>
            </p>
            <div className="flex shrink-0 gap-2 max-sm:w-full">
              <button type="button" className="btn btn-secondary btn-sm max-sm:flex-1" onClick={() => setAsking(false)} autoFocus>
                Keep
              </button>
              <SubmitButton pending="Switching off…" className="btn btn-danger btn-sm max-sm:flex-1">
                Switch off
              </SubmitButton>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex min-h-12 items-center justify-between gap-3 py-1.5 pr-2 pl-5"
          >
            <span className="shrink-0 text-xs whitespace-nowrap text-muted">
              Code <span className="font-mono tracking-wider text-ink-3">{code}</span>
            </span>
            {off ? (
              <form action={switchItem}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="to" value="on" />
                <SubmitButton pending="Switching on…" className="btn btn-secondary btn-sm">
                  Switch on
                </SubmitButton>
              </form>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={() => setAsking(true)} aria-label={`Lost it? Switch off this ${noun}`}>
                Lost it?
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
