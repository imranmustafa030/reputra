// The screen's own layout with grey blocks where the data will land.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded-md bg-hover" />
      <div className="mt-2 h-5 w-72 max-w-full rounded bg-hover" />
      <div className="panel mt-6 h-[98px]" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="panel h-[320px]" />
        <div className="panel h-[220px]" />
      </div>
    </div>
  );
}
