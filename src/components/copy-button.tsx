"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Joined to the field on its left by default (square inner corners); `standalone` rounds it fully.
export function CopyButton({ text, label = "Copy", standalone = false }: { text: string; label?: string; standalone?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 shrink-0 sm:min-h-10 items-center gap-1.5 border border-control bg-sheet px-3.5 text-sm font-medium transition-colors hover:bg-hover ${
        standalone ? "rounded-full" : "rounded-r-[10px]"
      }`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check aria-hidden="true" className="pop size-4 text-positive" strokeWidth={2.25} /> : <Copy aria-hidden="true" className="size-4" strokeWidth={1.75} />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
