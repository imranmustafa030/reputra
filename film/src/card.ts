// The Reputra tap card, ported from the website's card3d.js so the film shows the real product:
// ID-1 size (one unit = 1 cm), soft-touch black face with nine engraved bands in spot varnish,
// a gold edge, and the tap mark in amber foil.
import * as THREE from "three";

export const INK = "#0b0c0e";
const CARD_INK = "#14151a"; // a lifted black, so the card holds its shape on the dark stage
export const AMBER = "#f0ad2e";

export const W = 8.56;
export const H = 5.4;
const R = 0.32;
export const MARK = { x: 2.2, y: 0.2, r: 1 };
const BANDS = 9;

function rrect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slab(w: number, h: number, r: number, t: number) {
  const g = new THREE.ExtrudeGeometry(rrect(w, h, r), {
    depth: t,
    bevelEnabled: true,
    bevelThickness: t * 0.18,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 28,
  });
  g.center();
  return g;
}

function facePlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(rrect(w, h, r), 28);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[2 * i] = p.getX(i) / w + 0.5;
    uv[2 * i + 1] = p.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function markShapes(r: number) {
  const dot = new THREE.Shape().absarc(0, 0, r * 0.36, 0, Math.PI * 2, false);
  const a = THREE.MathUtils.degToRad(50);
  const ro = r * 1.13;
  const ri = r * 0.87;
  const cap = r * 0.13;
  const arc = new THREE.Shape();
  arc.absarc(0, 0, ro, -a, a, false);
  arc.absarc(Math.cos(a) * r, Math.sin(a) * r, cap, a, a + Math.PI, false);
  arc.absarc(0, 0, ri, a, -a, true);
  arc.absarc(Math.cos(a) * r, -Math.sin(a) * r, cap, -a + Math.PI, -a + Math.PI * 2, false);
  return { dot, arc };
}

function drawMark(g: CanvasRenderingContext2D, x: number, y: number, r: number, dotColor: string, arcColor: string) {
  g.fillStyle = dotColor;
  g.beginPath();
  g.arc(x, y, r * 0.36, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = arcColor;
  g.lineWidth = r * 0.26;
  g.lineCap = "round";
  g.beginPath();
  g.arc(x, y, r, -0.873, 0.873);
  g.stroke();
}

function bandPath(g: CanvasRenderingContext2D, mx: number, my: number, i: number, k: number, inset = 0) {
  const base = (250 + i * 165) * k - inset;
  g.beginPath();
  for (let s = 0; s <= 720; s++) {
    const t = (s / 720) * Math.PI * 2;
    const r = base + (26 * Math.sin(7 * t + i * 0.6) + 11 * Math.sin(17 * t - i * 0.45)) * k * (0.6 + i * 0.08);
    const x = mx + Math.cos(t) * r;
    const y = my + Math.sin(t) * r;
    if (s) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

function engraving(g: CanvasRenderingContext2D, w: number, h: number, paint: (g: CanvasRenderingContext2D, fade: number, k: number) => void) {
  const k = w / 2048;
  const mx = (MARK.x / W + 0.5) * w;
  const my = (0.5 - MARK.y / H) * h;
  for (let i = 0; i < BANDS; i++) {
    paint(g, Math.max(0.25, 1 - i / BANDS), k);
    bandPath(g, mx, my, i, k);
    g.stroke();
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function texture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function frontTexture(font: string) {
  const w = 2048;
  const h = 1292;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  g.fillStyle = CARD_INK;
  g.fillRect(0, 0, w, h);
  engraving(g, w, h, (g, fade, k) => {
    g.lineWidth = 28 * k;
    g.strokeStyle = `rgba(255,255,255,${(0.1 * fade).toFixed(3)})`;
  });
  const mx = (MARK.x / W + 0.5) * w;
  const my = (0.5 - MARK.y / H) * h;
  for (let i = 0; i < BANDS; i++) {
    g.lineWidth = 2.5;
    g.strokeStyle = `rgba(255,255,255,${(0.18 * Math.max(0.25, 1 - i / BANDS)).toFixed(3)})`;
    bandPath(g, mx, my, i, 1, 14);
    g.stroke();
  }
  drawMark(g, 196, 236, 40, AMBER, "rgba(226,228,232,0.95)");
  g.fillStyle = "rgba(226,228,232,0.95)";
  g.font = `600 100px ${font}`;
  g.letterSpacing = "-4px";
  g.fillText("reputra", 268, 271);
  g.letterSpacing = "7px";
  g.fillStyle = "rgba(226,228,232,0.5)";
  g.font = `500 40px ${font}`;
  g.fillText("TAP TO REVIEW ON GOOGLE", 156, h - 150);
  return texture(c, true);
}

function varnishMap() {
  const c = canvas(1024, 646);
  const g = c.getContext("2d")!;
  g.fillStyle = "rgb(245,245,245)";
  g.fillRect(0, 0, c.width, c.height);
  engraving(g, c.width, c.height, (g, fade, k) => {
    g.lineWidth = 28 * k;
    g.strokeStyle = `rgba(18,18,18,${(0.6 + 0.4 * fade).toFixed(3)})`;
  });
  return texture(c, false);
}

function shineMask() {
  const c = canvas(1024, 646);
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "copy";
  engraving(g, c.width, c.height, (g, fade, k) => {
    g.lineWidth = 28 * k;
    g.strokeStyle = `rgba(255,255,255,${(0.55 + 0.45 * fade).toFixed(3)})`;
  });
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(0, 0, c.width, c.height);
  return texture(c, false);
}

function engraveMap() {
  const c = canvas(1024, 646);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "rgb(128,128,128)";
  g.fillRect(0, 0, c.width, c.height);
  g.filter = "blur(2.5px)";
  engraving(g, c.width, c.height, (g, fade, k) => {
    g.lineWidth = 28 * k;
    g.strokeStyle = `rgba(60,60,60,${(0.5 + 0.5 * fade).toFixed(3)})`;
  });
  g.filter = "none";
  const w = c.width;
  const h = c.height;
  const src = g.getImageData(0, 0, w, h).data;
  const out = g.createImageData(w, h);
  const d = out.data;
  const s = 2.2 / 255;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 255;
    d[i + 3] = 255;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const dx = (src[i + 4] - src[i - 4]) * s;
      const dy = (src[i + w * 4] - src[i - w * 4]) * s;
      const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      d[i] = (-dx * l * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * l * 0.5 + 0.5) * 255;
      d[i + 2] = (l * 0.5 + 0.5) * 255;
    }
  }
  g.putImageData(out, 0, 0);
  return texture(c, false);
}

// Everything the card is made of, built once. `foil` is returned so the film can light it at the tap.
export function buildCard(font: string) {
  const card = new THREE.Group();
  const faceMat = new THREE.MeshPhysicalMaterial({ map: frontTexture(font), metalness: 0, roughness: 1, envMapIntensity: 1.4 });
  faceMat.roughnessMap = varnishMap();
  faceMat.specularIntensityMap = shineMask();
  faceMat.normalMap = engraveMap();
  faceMat.normalScale = new THREE.Vector2(1.1, 1.1);
  const faceBody = new THREE.MeshPhysicalMaterial({ color: CARD_INK, roughness: 0.95, envMapIntensity: 0.55 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 });

  const face = new THREE.Group();
  face.position.z = 0.05;
  const body = new THREE.Mesh(slab(W, H, R, 0.03), [faceBody, gold]);
  const print = new THREE.Mesh(facePlane(W - 0.02, H - 0.02, R), faceMat);
  print.position.z = 0.023;
  const { dot, arc } = markShapes(MARK.r);
  const foilMat = new THREE.MeshPhysicalMaterial({
    color: AMBER,
    metalness: 0.2,
    roughness: 0.6,
    emissive: AMBER,
    emissiveIntensity: 0.1,
    envMapIntensity: 0.6,
    specularIntensity: 0.4,
  });
  const foilGeo = (s: THREE.Shape) =>
    new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 48 });
  const foilDot = new THREE.Mesh(foilGeo(dot), foilMat);
  const foilArc = new THREE.Mesh(foilGeo(arc), foilMat);
  foilDot.position.set(MARK.x, MARK.y, 0.026);
  foilArc.position.set(MARK.x, MARK.y, 0.026);
  face.add(body, print, foilDot, foilArc);

  const core = new THREE.Mesh(slab(W, H, R, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xededeb, roughness: 0.7, clearcoat: 0.2 }));
  core.position.z = -0.02;
  card.add(face, core);

  // the shockwaves of the tap, lying on the card's face around the mark
  // fine lines of light, added to what is behind them rather than painted over it
  const rings = [0, 1].map(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.235, 200),
      new THREE.MeshBasicMaterial({
        color: AMBER,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    m.position.set(MARK.x, MARK.y, 0.12);
    card.add(m);
    return m;
  });

  return { card, foilMat, rings };
}
