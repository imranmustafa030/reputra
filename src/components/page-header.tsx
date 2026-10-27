// The title row every working screen starts with: a noun at 24px, one grey line about
// the data (the finding, not instructions), and at most the screen's one action on the right.
export function PageHeader({ title, lede, children }: { title: React.ReactNode; lede?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-[1.5rem] leading-8 font-semibold tracking-[-0.02em]">{title}</h1>
        {lede && <p className="mt-1 max-w-[70ch] text-[0.9375rem] text-muted">{lede}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

// A heading that sits outside its card, 8px above it.
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex min-h-7 items-center justify-between gap-4">
      <h2 className="text-[0.9375rem] font-semibold">{children}</h2>
      {action}
    </div>
  );
}
