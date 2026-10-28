import * as THREE from "three";

// The print on each product, drawn at runtime in the page's own typeface (Geist via next/font).
// Layouts are written in "design pixels" at roughly print resolution and scaled down onto canvases
// of at most 1024 px on the long side (1536 for the tall stand insert), which is still about twice
// what the stage shows at 1.5x. Nothing here encodes a URL: the stand's code is a decorative
// pattern labelled "Sample".

export type ProductKind = "stand" | "card" | "sticker";
export type PrintKind = ProductKind | "cardBack";

export const INK = "#111214";
export const INK_3 = "#3a3c40";
export const PAPER = "#fcfcfd";
export const AMBER = "#eeac2c";
export const MUTED = "#6b6e75";

const PAPER_3 = "#eeeff1";
const LIGHT_TEXT = "rgba(236,237,240,0.96)";
const LIGHT_SOFT = "rgba(236,237,240,0.66)";

// [canvas px, design px] per print, both in the product's own aspect ratio
const SIZES: Record<PrintKind, { px: readonly [number, number]; design: readonly [number, number] }> = {
  stand: { px: [1024, 1536], design: [1200, 1800] }, // 100 × 150 mm insert
  card: { px: [1024, 646], design: [1712, 1080] }, // 85.6 × 54 mm
  cardBack: { px: [512, 323], design: [856, 540] },
  sticker: { px: [1024, 1024], design: [1200, 1200] }, // 50 mm disc
};

/** An empty print texture for one product; `paintPrint` fills it. */
export function createPrintTexture(kind: PrintKind) {
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = SIZES[kind].px;
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/** Repaints a print texture; three re-uploads it the next time it is drawn. */
export function paintPrint(t: THREE.CanvasTexture, kind: PrintKind, businessName: string, font: string, anisotropy: number) {
  drawPrint(t.image as HTMLCanvasElement, kind, businessName, font);
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
}

/** Draws one print into a canvas, sizing the canvas to the product. Also used for the flat
 *  fallback when WebGL is unavailable. */
export function drawPrint(c: HTMLCanvasElement, kind: PrintKind, businessName: string, font: string) {
  const { px, design } = SIZES[kind];
  if (c.width !== px[0]) c.width = px[0];
  if (c.height !== px[1]) c.height = px[1];
  const g = c.getContext("2d");
  if (!g) return;
  const [w, h] = design;
  const name = businessName.trim().replace(/\s+/g, " ") || "Your business";
  g.save();
  g.clearRect(0, 0, c.width, c.height);
  g.scale(px[0] / w, px[1] / h);
  g.textBaseline = "alphabetic";
  if (kind === "stand") drawStand(g, w, h, name, font);
  else if (kind === "card") drawCard(g, w, h, name, font);
  else if (kind === "cardBack") drawCardBack(g, w, h);
  else drawSticker(g, w, h, name, font);
  g.restore();
}

/* ------------------------------------------------------------------ primitives */

function setFont(g: CanvasRenderingContext2D, weight: number, size: number, font: string, tracking = 0) {
  g.font = `${weight} ${size}px ${font}`;
  // letterSpacing is not in every engine yet; without it the text is simply set a touch looser
  if ("letterSpacing" in g) g.letterSpacing = `${(tracking * size).toFixed(2)}px`;
}

type Fit = { size: number; lines: string[] };

/** The largest size (max → min) at which the text fits in `width`, on one line or, when allowed,
 *  two balanced lines. Below the minimum it truncates with an ellipsis. */
function fitText(
  g: CanvasRenderingContext2D,
  text: string,
  o: { font: string; weight: number; max: number; min: number; width: number; tracking?: number; twoLines?: boolean },
): Fit {
  const measure = (s: string, size: number) => {
    setFont(g, o.weight, size, o.font, o.tracking);
    return g.measureText(s).width;
  };
  const one = measure(text, o.max);
  const oneSize = Math.min(o.max, Math.floor((o.max * o.width) / Math.max(one, 1)));
  // one line reads best, so it wins unless it has to shrink a lot and two lines would not
  if (oneSize >= o.max * 0.82 || !o.twoLines || !text.includes(" ")) {
    if (oneSize >= o.min) return { size: oneSize, lines: [text] };
  }
  if (o.twoLines && text.includes(" ")) {
    const words = text.split(" ");
    let best: { lines: string[]; w: number } | null = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const w = Math.max(measure(a, o.max), measure(b, o.max));
      if (!best || w < best.w) best = { lines: [a, b], w };
    }
    if (best) {
      const size = Math.min(o.max, Math.floor((o.max * o.width) / best.w));
      if (size >= o.min && size > oneSize) return { size, lines: best.lines };
    }
  }
  if (oneSize >= o.min) return { size: oneSize, lines: [text] };
  return { size: o.min, lines: [truncate(g, text, o.width, o.min, o)] };
}

function truncate(g: CanvasRenderingContext2D, text: string, width: number, size: number, o: { font: string; weight: number; tracking?: number }) {
  setFont(g, o.weight, size, o.font, o.tracking);
  if (g.measureText(text).width <= width) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (g.measureText(text.slice(0, mid).trimEnd() + "…").width <= width) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "…";
}

/** Five filled stars, starting at x (left edge) with their vertical centre on cy. Returns the row width. */
function stars(g: CanvasRenderingContext2D, x: number, cy: number, size: number, color: string, align: "left" | "center" = "left") {
  const gap = size * 0.24;
  const total = size * 5 + gap * 4;
  let left = align === "center" ? x - total / 2 : x;
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineJoin = "round";
  g.lineWidth = size * 0.08;
  for (let i = 0; i < 5; i++) {
    const cx = left + size / 2;
    const ro = size / 2;
    const ri = ro * 0.47;
    g.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 ? ri : ro;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 1.0 + size * 0.04;
      if (p) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.stroke();
    left += size + gap;
  }
  return total;
}

/** The Reputra mark: a tap (the dot) and the ripple it sends (one arc). `r` is the arc radius;
 *  (x, y) is the dot's centre. The mark's visual width runs from x - 0.36r to x + 1.13r. */
function mark(g: CanvasRenderingContext2D, x: number, y: number, r: number, dot: string, arc: string) {
  g.fillStyle = dot;
  g.beginPath();
  g.arc(x, y, r * 0.36, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = arc;
  g.lineWidth = r * 0.26;
  g.lineCap = "round";
  g.beginPath();
  g.arc(x, y, r, -0.873, 0.873);
  g.stroke();
}

/** "Powered by Reputra" on a solid pill. Anchored by its right edge and vertical centre (or centre x). */
function poweredBy(
  g: CanvasRenderingContext2D,
  o: { font: string; size: number; x: number; cy: number; bg: string; fg: string; dot: string; align?: "right" | "center" },
) {
  const { font, size } = o;
  const h = size * 1.9;
  const padX = size * 0.78;
  const markR = size * 0.36;
  const markW = markR * 1.5 + size * 0.42; // the mark plus the space after it
  setFont(g, 450, size, font, -0.005);
  const a = "Powered by ";
  const aw = g.measureText(a).width;
  setFont(g, 640, size, font, -0.015);
  const b = "Reputra";
  const bw = g.measureText(b).width;
  const w = padX * 2 + markW + aw + bw;
  const left = o.align === "center" ? o.x - w / 2 : o.x - w;
  const top = o.cy - h / 2;
  g.fillStyle = o.bg;
  g.beginPath();
  g.roundRect(left, top, w, h, h / 2);
  g.fill();
  mark(g, left + padX + markR * 0.36, o.cy, markR, o.dot, o.fg);
  const base = o.cy + size * 0.36;
  g.fillStyle = o.fg;
  setFont(g, 450, size, font, -0.005);
  g.textAlign = "left";
  g.fillText(a, left + padX + markW, base);
  setFont(g, 640, size, font, -0.015);
  g.fillText(b, left + padX + markW + aw, base);
  return { w, h };
}

/** Faint ripples spreading from the mark, tone on tone, as on the website's tap card. */
function ripples(g: CanvasRenderingContext2D, cx: number, cy: number, from: number, step: number, count: number, color: (i: number) => string, width: number) {
  for (let i = 0; i < count; i++) {
    g.strokeStyle = color(i);
    g.lineWidth = width;
    g.beginPath();
    g.arc(cx, cy, from + i * step, 0, Math.PI * 2);
    g.stroke();
  }
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A decorative module pattern that looks like a QR code and is deliberately not one: no timing
 *  or format information, random modules, and a knocked-out centre carrying the mark. */
function sampleCode(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const n = 25;
  const cell = size / n;
  const rnd = seeded(20260914);
  const inFinder = (cx: number, cy: number) => (cx < 8 && cy < 8) || (cx > n - 9 && cy < 8) || (cx < 8 && cy > n - 9);
  const inCentre = (cx: number, cy: number) => Math.abs(cx - 12) <= 3 && Math.abs(cy - 12) <= 3;
  g.fillStyle = INK;
  for (let cy = 0; cy < n; cy++) {
    for (let cx = 0; cx < n; cx++) {
      if (inFinder(cx, cy) || inCentre(cx, cy) || rnd() < 0.52) continue;
      g.beginPath();
      g.roundRect(x + cx * cell + cell * 0.06, y + cy * cell + cell * 0.06, cell * 0.88, cell * 0.88, cell * 0.22);
      g.fill();
    }
  }
  const finder = (fx: number, fy: number) => {
    const px = x + fx * cell;
    const py = y + fy * cell;
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(px, py, cell * 7, cell * 7, cell * 1.6);
    g.fill();
    g.fillStyle = PAPER;
    g.beginPath();
    g.roundRect(px + cell, py + cell, cell * 5, cell * 5, cell * 1.05);
    g.fill();
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(px + cell * 2, py + cell * 2, cell * 3, cell * 3, cell * 0.7);
    g.fill();
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  const r = cell * 2.1;
  mark(g, x + size / 2 - r * 0.38, y + size / 2, r, AMBER, INK);
}

/* ------------------------------------------------------------------ products */

function drawStand(g: CanvasRenderingContext2D, w: number, h: number, name: string, font: string) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  const margin = 104;
  const cx = w / 2;

  // the mark, top left, like a maker's stamp
  mark(g, margin + 14, margin + 34, 38, AMBER, INK);

  // the business name, centred in the upper band, one or two lines
  const fit = fitText(g, name, { font, weight: 640, max: 136, min: 60, width: w - margin * 2 - 20, tracking: -0.03, twoLines: true });
  setFont(g, 640, fit.size, font, -0.03);
  g.fillStyle = INK;
  g.textAlign = "center";
  const lh = fit.size * 1.06;
  const bandMid = 400;
  const firstBase = bandMid - ((fit.lines.length - 1) * lh) / 2 + fit.size * 0.36;
  fit.lines.forEach((line, i) => g.fillText(line, cx, firstBase + i * lh));

  stars(g, cx, 612, 66, AMBER, "center");

  // the call to action
  const cta = fitText(g, "Scan or tap to review us on Google", { font, weight: 520, max: 62, min: 40, width: 860, tracking: -0.015, twoLines: true });
  setFont(g, 520, cta.size, font, -0.015);
  g.fillStyle = INK_3;
  const clh = cta.size * 1.24;
  cta.lines.forEach((line, i) => g.fillText(line, cx, 748 + i * clh));

  // the sample code, in a quiet frame
  const qs = 500;
  const qx = cx - qs / 2;
  const qy = 930;
  g.fillStyle = "#ffffff";
  g.strokeStyle = "rgba(17,18,20,0.12)";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(qx - 36, qy - 36, qs + 72, qs + 72, 34);
  g.fill();
  g.stroke();
  sampleCode(g, qx, qy, qs);

  // "Sample", small, sitting on the frame's lower edge so the code can never pass for a real one
  setFont(g, 560, 34, font, 0.01);
  const sw = g.measureText("Sample").width + 48;
  const sy = qy + qs + 36;
  g.fillStyle = PAPER_3;
  g.beginPath();
  g.roundRect(cx - sw / 2, sy - 28, sw, 56, 28);
  g.fill();
  g.fillStyle = MUTED;
  g.fillText("Sample", cx, sy + 12);

  poweredBy(g, { font, size: 34, x: w - margin + 20, cy: h - margin + 6, bg: INK, fg: PAPER, dot: AMBER });
}

function drawCard(g: CanvasRenderingContext2D, w: number, h: number, name: string, font: string) {
  g.fillStyle = INK;
  g.fillRect(0, 0, w, h);
  const markX = w - 236;
  const markY = 214;
  ripples(g, markX, markY, 150, 132, 9, (i) => `rgba(255,255,255,${(0.05 * (1 - i / 10)).toFixed(3)})`, 30);
  mark(g, markX, markY, 64, AMBER, LIGHT_TEXT);

  const left = 120;
  const fit = fitText(g, name, { font, weight: 620, max: 118, min: 64, width: w - left - 420, tracking: -0.03, twoLines: true });
  setFont(g, 620, fit.size, font, -0.03);
  g.fillStyle = LIGHT_TEXT;
  g.textAlign = "left";
  const lh = fit.size * 1.06;
  let y = 150 + fit.size * 0.74;
  fit.lines.forEach((line, i) => g.fillText(line, left, y + i * lh));
  y += (fit.lines.length - 1) * lh + fit.size * 0.5;

  stars(g, left, y + 40, 54, AMBER);

  setFont(g, 500, 50, font, -0.01);
  g.fillStyle = LIGHT_SOFT;
  g.fillText("Tap your phone here to review us", left, h - 124);

  poweredBy(g, { font, size: 34, x: w - 112, cy: h - 140, bg: AMBER, fg: INK, dot: INK });
}

function drawCardBack(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = INK;
  g.fillRect(0, 0, w, h);
  ripples(g, w / 2 - 6, h / 2, 70, 66, 9, (i) => `rgba(255,255,255,${(0.04 * (1 - i / 10)).toFixed(3)})`, 15);
  mark(g, w / 2 - 12, h / 2, 34, AMBER, "rgba(236,237,240,0.55)");
}

function drawSticker(g: CanvasRenderingContext2D, w: number, h: number, name: string, font: string) {
  const cx = w / 2;
  const r = w / 2;
  g.beginPath();
  g.arc(cx, h / 2, r, 0, Math.PI * 2);
  g.closePath();
  g.clip();
  g.fillStyle = INK;
  g.fillRect(0, 0, w, h);
  // a fine amber ring just inside the cut line
  g.strokeStyle = "rgba(238,172,44,0.9)";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, h / 2, r - 46, 0, Math.PI * 2);
  g.stroke();

  const mr = 88;
  const my = 330;
  ripples(g, cx - mr * 0.38, my, 150, 92, 4, (i) => `rgba(255,255,255,${(0.045 * (1 - i / 5)).toFixed(3)})`, 22);
  mark(g, cx - mr * 0.38, my, mr, AMBER, LIGHT_TEXT);

  g.textAlign = "center";
  setFont(g, 640, 116, font, -0.03);
  g.fillStyle = LIGHT_TEXT;
  g.fillText("Tap to review", cx, 620);

  stars(g, cx, 716, 58, AMBER, "center");

  // the name, one line or two (the disc is wide enough here), then an ellipsis
  const fit = fitText(g, name, { font, weight: 500, max: 54, min: 40, width: 700, tracking: -0.01, twoLines: true });
  setFont(g, 500, fit.size, font, -0.01);
  g.fillStyle = LIGHT_SOFT;
  const nlh = fit.size * 1.18;
  fit.lines.forEach((line, i) => g.fillText(line, cx, 836 - ((fit.lines.length - 1) * nlh) / 2 + i * nlh));

  poweredBy(g, { font, size: 36, x: cx, cy: 958, bg: AMBER, fg: INK, dot: INK, align: "center" });
}
