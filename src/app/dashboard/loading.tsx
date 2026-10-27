// The screen's own layout with grey blocks where the numbers will land, so nothing jumps when they do.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded-md bg-hover" />
      <div className="mt-2 h-5 w-80 max-w-full rounded bg-hover" />
      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="panel h-[420px] p-6">
          <div className="h-4 w-44 rounded bg-hover" />
          <div className="mt-3 h-10 w-24 rounded bg-hover" />
          <div className="mt-8 h-[168px] rounded bg-frame" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
          <div className="panel h-[220px]" />
          <div className="panel h-[96px]" />
        </div>
      </div>
    </div>
  );
}
