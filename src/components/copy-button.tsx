"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";

// Joined to the field on its left by default (square inner corners); `standalone` rounds it fully.
// Says so when the phone refuses to copy, and a second tap restarts the "Copied" moment instead of
// letting the first tap's timer cut it short.
export function CopyButton({ text, label = "Copy", standalone = false }: { text: string; label?: string; standalone?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 shrink-0 sm:min-h-10 items-center gap-1.5 border border-control bg-sheet px-3.5 text-sm font-medium transition-colors hover:bg-hover ${
        standalone ? "rounded-full" : "rounded-r-[10px]"
      }`}
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "copied" : "failed");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), ok ? 1600 : 2600);
      }}
    >
      {state === "copied" ? <Check aria-hidden="true" className="pop size-4 text-positive" strokeWidth={2.25} /> : <Copy aria-hidden="true" className="size-4" strokeWidth={1.75} />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label}</span>
    </button>
  );
}
