import { ProductStageSkeleton } from "./product-stage-skeleton";

// The shop's own layout in grey, so nothing jumps when the items and the 3D stage arrive.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-8 w-28 rounded-md bg-hover" />
      <div className="mt-2 h-5 w-[34rem] max-w-full rounded bg-hover" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        <div className="aspect-[4/3.4] overflow-hidden rounded-2xl border border-edge max-lg:aspect-[4/3]">
          <ProductStageSkeleton className="size-full" />
        </div>
        <div className="grid content-start gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[94px] rounded-[14px] border border-edge" />
          ))}
          <div className="mt-4 h-[84px] rounded-[14px] border border-edge" />
        </div>
      </div>
    </div>
  );
}
