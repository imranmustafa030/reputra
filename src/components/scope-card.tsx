// Whose account this is, at the head of the sidebar: an ink monogram tile, the name, and one
// line of meta. It sits straight on the stone frame (no box), so the only white piece in the
// sidebar is the selected row.
export function ScopeCard({ name, meta }: { name: string; meta: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter((w) => /\p{L}|\p{N}/u.test(w.charAt(0)))
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "·";

  return (
    <div className="flex items-center gap-3 px-1.5 py-1">
      <span aria-hidden="true" className="monogram grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink text-[0.8125rem] font-semibold tracking-[-0.02em] text-paper">
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] leading-5 font-semibold tracking-[-0.01em]">{name}</span>
        <span className="block truncate text-xs leading-4 text-muted">{meta}</span>
      </span>
    </div>
  );
}
