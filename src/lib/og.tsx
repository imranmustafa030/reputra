// The share cards WhatsApp, Facebook and others show under a Reputra link: the dashboard's
// ink and gold, the mark, and one clear line. Drawn by next/og (flexbox only, inline styles),
// set in Geist, which next/og ships.
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#121110";
const PAPER = "#f7f5f0";
const MUTED = "#a8a29a";
const AMBER = "#eeac2c";

export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "64px 72px",
        backgroundColor: INK,
        backgroundImage: `radial-gradient(900px 560px at -8% -14%, rgba(238,172,44,0.42), rgba(238,172,44,0) 70%), radial-gradient(700px 520px at 108% 116%, rgba(160,98,40,0.30), rgba(160,98,40,0) 64%)`,
        color: PAPER,
        fontFamily: "Geist",
      }}
    >
      {children}
    </div>
  );
}

// the dot and its ripple, then the name
export function OgBrand({ size = 34, color = PAPER }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="7.5" cy="12" r="3.6" fill={AMBER} />
        <path d="M13.93 4.34A10 10 0 0 1 13.93 19.66" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: size * 1.05, letterSpacing: "-0.05em", color }}>reputra</span>
    </div>
  );
}

export function OgStars({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.22 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={AMBER} />
        </svg>
      ))}
    </div>
  );
}

export const OG_COLORS = { INK, PAPER, MUTED, AMBER };
