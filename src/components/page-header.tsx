export function PageHeader({ title, lede, children }: { title: string; lede?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] md:text-[2rem]">{title}</h1>
        {lede && <p className="mt-2 max-w-[60ch] text-stone">{lede}</p>}
      </div>
      {children}
    </header>
  );
}
