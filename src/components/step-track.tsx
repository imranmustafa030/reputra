import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export type Step = { title: string; detail: string; state: "done" | "current" | "next"; href?: string; lede?: string };

// Steps in a row, each saying where it stands: a green check for done, amber "Now" with an
// underline for the step in hand, a muted number for what's next. The same marks everywhere
// a process is tracked (setup, the stand and card on their way).
export function StepTrack({ steps, label, className = "" }: { steps: Step[]; label: string; className?: string }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <section aria-label={`${label}: ${done} of ${steps.length} done`} className={`panel grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {steps.map((s, i) => {
        const body = (
          <>
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                s.state === "done" ? "text-positive" : s.state === "current" ? "text-amber-ink" : "text-muted"
              }`}
            >
              {s.state === "done" ? (
                <Check aria-hidden="true" className="pop size-3.5" strokeWidth={2.5} style={{ "--d": `${120 + i * 90}ms` } as React.CSSProperties} />
              ) : (
                <span className="num">{i + 1}</span>
              )}
              {s.state === "done" ? "Done" : s.state === "current" ? "Now" : "Next"}
            </span>
            <span className="mt-1.5 block font-medium">{s.title}</span>
            <span className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              {s.detail}
              {s.href && <ArrowRight aria-hidden="true" className="step-arrow size-3.5 shrink-0" strokeWidth={2} />}
            </span>
            {s.state === "current" && <span aria-hidden="true" className="grow-line absolute inset-x-0 bottom-0 h-0.5 bg-amber" style={{ "--d": "380ms" } as React.CSSProperties} />}
          </>
        );
        const cls = `relative block px-5 py-4 ${i ? "border-t border-edge sm:border-t-0 sm:[&:nth-child(n+3)]:border-t xl:[&:nth-child(n+3)]:border-t-0" : ""} ${
          i % 2 ? "sm:border-l sm:border-edge" : ""
        } ${i ? "xl:border-l xl:border-edge" : ""}`;
        return s.href ? (
          <Link key={s.title} href={s.href} className={`${cls} group transition-colors hover:bg-frame`}>
            {body}
          </Link>
        ) : (
          <div key={s.title} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

// The free stand and card, from order to the counter.
export function packSteps(
  status: "new" | "printing" | "on_the_way" | "installed" | "canceled",
  all: { status: string; label: string; owner: string }[],
): Step[] {
  const at = all.findIndex((s) => s.status === status);
  return all.map((s, i) => ({
    title: s.label,
    detail: s.owner,
    state: status === "installed" || i < at ? "done" : i === at ? "current" : "next",
  }));
}
