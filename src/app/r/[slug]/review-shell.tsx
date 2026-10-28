import { Noto_Nastaliq_Urdu } from "next/font/google";
import { FilmStage } from "./intro";

// Urdu is set in Nastaliq. It only downloads when a customer switches to Urdu.
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-nastaliq", preload: false, display: "swap" });

// The frame every review page shares, whether it was opened by code (/t/K7X9Q2) or by name (/r/…).
export function ReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main data-theme="light" className={`rv-page relative flex min-h-dvh flex-col overflow-clip bg-(--rv-bg) px-5 pt-6 pb-3 text-(--rv-fg) ${nastaliq.variable}`}>
      {/* in the static shell, so the opening film starts downloading with the first bytes */}
      <FilmStage />
      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col lg:max-w-[1320px] lg:px-[2vw]">
        {children}
        <a href="/" className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-center pt-4 text-xs text-(--rv-fg3) transition-colors hover:text-(--rv-fg)">
          Powered by
          <span className="font-semibold tracking-[-0.04em] text-(--rv-fg2)">reputra</span>
        </a>
      </div>
    </main>
  );
}

export function ReviewSkeleton() {
  return (
    <div aria-busy="true">
      <div className="ml-auto h-11 w-64 rounded-full bg-(--rv-field)" />
      <div className="mt-10 h-11 w-60 rounded-lg bg-(--rv-field)" />
      <div className="mt-4 h-6 w-72 rounded bg-(--rv-field)" />
      <div className="mt-10 flex justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="size-14 rounded-full bg-(--rv-field)" />
        ))}
      </div>
    </div>
  );
}
