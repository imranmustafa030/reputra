import type { ProductKind } from "@/lib/shop";

// Flat drawings of the printed items, matching the shop's 3D models: the acrylic stand on its
// walnut base, the ink tap card, the round tap sticker. They picture the owner's own things,
// so they are product imagery, not decoration. Physical colours, so fixed values.
const INK = "#111214";
const AMBER = "#eeac2c";

export function ProductArt({ kind, className = "" }: { kind: ProductKind; className?: string }) {
  return (
    <svg viewBox="0 0 160 100" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={`floor-${kind}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#111214" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#111214" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="88" rx="52" ry="6" fill={`url(#floor-${kind})`} />
      {kind === "stand" ? <Stand /> : kind === "card" ? <Card /> : <Sticker />}
    </svg>
  );
}

// the dot and its ripple, the Reputra mark
function Mark({ x, y, s = 1, ripple = INK }: { x: number; y: number; s?: number; ripple?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="0" r="2.4" fill={AMBER} />
      <path d="M4.2 -5.2a7 7 0 0 1 0 10.4" fill="none" stroke={ripple} strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

function Stars({ x, y, gap = 5.2, r = 1.9 }: { x: number; y: number; gap?: number; r?: number }) {
  return (
    <g fill={AMBER}>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={x + i * gap} cy={y} r={r} />
      ))}
    </g>
  );
}

function Stand() {
  return (
    <g>
      {/* acrylic sheet with its printed card */}
      <rect x="56" y="8" width="48" height="70" rx="2.5" fill="#f4f8f7" stroke="#d9e3e0" />
      <rect x="59" y="11" width="42" height="64" rx="1.5" fill="#ffffff" />
      <Mark x={64} y={18} s={0.7} />
      <rect x="66" y="25" width="28" height="3.4" rx="1.7" fill={INK} />
      <Stars x={69.6} y={33} gap={5.2} r={1.5} />
      {/* the sample code: three finder squares and a few modules */}
      <g fill={INK}>
        <rect x="70" y="40" width="7" height="7" rx="1.4" />
        <rect x="83" y="40" width="7" height="7" rx="1.4" />
        <rect x="70" y="53" width="7" height="7" rx="1.4" />
        <rect x="80" y="50" width="2.4" height="2.4" />
        <rect x="84" y="53" width="2.4" height="2.4" />
        <rect x="87" y="56" width="2.4" height="2.4" />
        <rect x="80" y="57" width="2.4" height="2.4" />
      </g>
      <rect x="83" y="67" width="15" height="3.6" rx="1.8" fill={INK} />
      {/* a highlight down the acrylic edge */}
      <rect x="57.5" y="9.5" width="1.4" height="67" rx="0.7" fill="#ffffff" opacity="0.9" />
      {/* walnut base with its slot */}
      <rect x="44" y="74" width="72" height="12" rx="3" fill="#6e4a2c" />
      <rect x="44" y="74" width="72" height="4" rx="2" fill="#86603d" />
      <rect x="54" y="75.4" width="52" height="1.6" rx="0.8" fill="#2b1a0d" opacity="0.85" />
    </g>
  );
}

function Card() {
  return (
    <g transform="rotate(-8 80 50)">
      <rect x="40" y="22" width="80" height="51" rx="4" fill={INK} />
      <rect x="40" y="22" width="80" height="51" rx="4" fill="url(#sheen)" opacity="0.35" />
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Mark x={50} y={34} s={0.85} ripple="#f7f6f2" />
      <rect x="48" y="45" width="36" height="4" rx="2" fill="#f7f6f2" />
      <Stars x={50} y={56} gap={5} r={1.5} />
      <rect x="95" y="62" width="19" height="5" rx="2.5" fill={AMBER} />
    </g>
  );
}

function Sticker() {
  return (
    <g>
      <circle cx="80" cy="46" r="34" fill={INK} />
      <circle cx="80" cy="46" r="31" fill="none" stroke={AMBER} strokeWidth="1.2" />
      <Mark x={77} y={33} s={0.95} ripple="#f7f6f2" />
      <rect x="64" y="43" width="32" height="4" rx="2" fill="#f7f6f2" />
      <Stars x={69.6} y={53} gap={5.2} r={1.5} />
      <rect x="71" y="61" width="18" height="4.6" rx="2.3" fill={AMBER} />
    </g>
  );
}
