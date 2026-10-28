import { ImageResponse } from "next/og";
import { getPublicEntry } from "@/lib/public";
import { OG_COLORS, OG_SIZE, OgBrand, OgFrame, OgStars } from "@/lib/og";

// What a customer sees under the review link in WhatsApp: the business's own name, so they know
// who is asking before they tap. Built once per code and cached with the review page.
export const alt = "How was your visit? Tap a star to leave a review";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const entry = await getPublicEntry(code.toUpperCase());
  const name = entry && !entry.off ? entry.business.name : "";
  const nameSize = name.length > 26 ? 66 : name.length > 16 ? 80 : 96;

  return new ImageResponse(
    (
      <OgFrame>
        <OgBrand size={28} color={OG_COLORS.MUTED} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <span style={{ fontSize: 38, color: OG_COLORS.MUTED, letterSpacing: "-0.02em" }}>{name ? "Thank you for visiting" : "Thank you for your visit"}</span>
          {name && (
            <span style={{ marginTop: 10, fontSize: nameSize, lineHeight: 1.04, letterSpacing: "-0.045em", maxWidth: 1050 }}>
              {name.length > 48 ? `${name.slice(0, 47)}…` : name}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 40 }}>
            <OgStars size={52} />
            <span style={{ fontSize: 30, color: OG_COLORS.PAPER, letterSpacing: "-0.01em" }}>How was your visit?</span>
          </div>
          <span style={{ marginTop: 22, fontSize: 26, color: OG_COLORS.MUTED }}>Tap a star · 30 seconds · English or Urdu</span>
        </div>
      </OgFrame>
    ),
    size,
  );
}
