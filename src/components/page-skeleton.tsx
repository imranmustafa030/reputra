// The layout of a working screen with flat grey blocks where its data will land: a title, its
// finding, then a list or form. Shown while a page streams in after a click in the menu.
export function PageSkeleton({ rows = 5, rail = false }: { rows?: number; rail?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-hover" />
      <div className="mt-2 h-5 w-80 max-w-full rounded bg-hover" />
      <div className={`mt-6 grid gap-4 ${rail ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <div className="panel px-5 py-2">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={`flex items-center justify-between gap-6 py-4 ${i ? "border-t border-rule" : ""}`}>
              <div className="h-4 w-2/5 rounded bg-hover" />
              <div className="h-4 w-20 rounded bg-hover" />
            </div>
          ))}
        </div>
        {rail && <div className="panel h-[220px]" />}
      </div>
    </div>
  );
}
