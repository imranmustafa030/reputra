// What the shop shows while the 3D stage (and three.js) loads: the stage's box in the frame's pale
// stone, with the floor's soft shadow where the product will stand. No three.js imports here.
export function ProductStageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-full w-full ${className}`}>
      <div className="absolute inset-[12%_22%_24%] rounded-[14px] bg-frame" />
      <div className="absolute bottom-[14%] left-1/2 h-[5%] w-[46%] -translate-x-1/2 rounded-[50%] bg-frame" />
    </div>
  );
}

export default ProductStageSkeleton;
