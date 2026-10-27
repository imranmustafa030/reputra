import { Brand } from "./brand";

// Login and sign-up as one full-bleed field of flat colour: the wordmark and the other door in
// the top corners, a two-ink statement anchored bottom-left, and the form itself at true size on
// the right. Each door has its own colour: amber to come back, ink to start.
export function EntryField({ tone, corner, children }: { tone: "amber" | "ink"; corner: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className={`entry entry-${tone} ${tone === "ink" ? "dark-surface" : ""}`}>
      <header className="entry-top">
        <Brand className={`relative ${tone === "ink" ? "text-paper" : "text-ink"}`} dot={tone === "amber" ? "fill-ink" : "fill-amber"} />
        <div className="entry-corner text-[15px]">{corner}</div>
      </header>
      <div className="entry-grid">{children}</div>
    </main>
  );
}
