import { formatShortDay } from "@/lib/labels";

// Columns per day with square tops on a zero baseline, 4 faint gridlines on round steps,
// the y scale on the left, 5 date labels. One series, one hue: the data is the amber.
// Drawn in HTML rather than SVG so labels stay crisp at any width.

function niceMax(max: number) {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => s * 4 >= max) ?? 10 * step;
  return nice * 4;
}

export function DailyBars({ days, label }: { days: { day: string; value: number }[]; label: string }) {
  const top = niceMax(Math.max(0, ...days.map((d) => d.value)));
  const ticks = [4, 3, 2, 1, 0].map((i) => (top / 4) * i);
  const labelEvery = Math.ceil(days.length / 5);
  const empty = days.every((d) => d.value === 0);

  return (
    <figure className="m-0" aria-label={label}>
      <div className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-2">
        <div className="relative h-[168px]" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-[11px] text-muted num" style={{ top: `${(i / 4) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-[168px]">
          {ticks.map((t, i) => (
            <span
              key={t}
              aria-hidden="true"
              className={`absolute inset-x-0 ${i === 4 ? "h-px bg-control" : "h-px bg-rule"}`}
              style={{ top: `${(i / 4) * 100}%` }}
            />
          ))}
          <ol className="absolute inset-0 flex items-end gap-[3px]">
            {days.map((d, i) => (
              <li key={d.day} className="group relative flex h-full flex-1 items-end" title={`${formatShortDay(d.day)}: ${d.value}`}>
                {/* Bars rise from the baseline, left to right, the first time the chart is seen. */}
                <span
                  className="grow-bar block w-full bg-amber transition-[filter] group-hover:brightness-90"
                  style={{ height: `${(d.value / top) * 100}%`, "--i": i } as React.CSSProperties}
                />
                <span className="sr-only">
                  {formatShortDay(d.day)}: {d.value}
                </span>
              </li>
            ))}
          </ol>
          {empty && (
            <p className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 bg-sheet px-3 text-center text-sm text-muted">
              Nobody yet. It starts with the first scan or tap.
            </p>
          )}
        </div>
        <span />
        <div className="relative mt-2 h-4" aria-hidden="true">
          {days.map((d, i) =>
            i % labelEvery === 0 || i === days.length - 1 ? (
              i === days.length - 1 || days.length - 1 - i >= labelEvery / 2 ? (
                <span
                  key={d.day}
                  className="absolute text-[11px] whitespace-nowrap text-muted"
                  style={
                    i === days.length - 1
                      ? { right: 0 }
                      : i === 0
                        ? { left: 0 }
                        : { left: `${((i + 0.5) / days.length) * 100}%`, transform: "translateX(-50%)" }
                  }
                >
                  {i === days.length - 1 ? "Today" : formatShortDay(d.day)}
                </span>
              ) : null
            ) : null,
          )}
        </div>
      </div>
    </figure>
  );
}
