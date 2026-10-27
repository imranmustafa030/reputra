export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-paper-3" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-paper-3" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[112px] rounded-2xl bg-paper-3" />
        ))}
      </div>
      <div className="mt-3 h-64 rounded-2xl bg-paper-3" />
    </div>
  );
}
