import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgBrand, OgFrame, OgStars } from "@/lib/og";

// The share card for the website and every app page without its own.
export const alt = "Reputra: more Google reviews, more customers";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <OgBrand />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <OgStars size={40} />
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 84, lineHeight: 1.02, letterSpacing: "-0.045em" }}>
            <span>More Google reviews.</span>
            <span style={{ color: OG_COLORS.AMBER }}>More customers.</span>
          </div>
          <span style={{ marginTop: 30, fontSize: 30, color: OG_COLORS.MUTED, letterSpacing: "-0.01em" }}>
            Counter stand, tap card and WhatsApp, for local businesses in Pakistan
          </span>
        </div>
      </OgFrame>
    ),
    size,
  );
}
