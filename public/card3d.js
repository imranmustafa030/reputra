/* Reputra · the three ways in: a counter stand, a tap card, and the WhatsApp message beside them.
   One rAF, one progress number, every write a pure function of it. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const INK = "#14151a"; // a lifted black, so the card holds its shape on the dark stage
const PAPER = "#f3f3f1";
const AMBER = "#f0ad2e";

const canvas = document.querySelector("[data-card-canvas]");
const stageEl = document.querySelector("[data-card-stage]");
const pinEl = document.querySelector("[data-card-pin]");
const beats = [...document.querySelectorAll("[data-beat]")];
const waChat = document.querySelector("[data-wa-chat]");
const closing = document.querySelector("[data-card-closing]");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// the scene is built in short steps with a breath between them, so the page never stops answering the hand
const breathe = () => (window.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch {
  document.documentElement.classList.remove("has-card"); // the head assumed WebGL; the static layout takes over
  document.documentElement.classList.add("no-webgl");
  throw new Error("WebGL unavailable");
}
document.documentElement.classList.add("has-card");
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.transmissionResolutionScale = 0.5; // refraction is already a blur; half resolution is invisible and cheaper

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, 2, 120); // a deep near plane keeps the thin layers from z-fighting

// a studio for nothing: PMREM from a procedural room, plus one softbox overhead
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
// a large softbox above and in front, where a product photographer would hang it: the varnished
// engraving on the card face reflects it as the card turns
const softMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // neutral, so the black stays black and the rings stay silver
softMat.color.multiplyScalar(5);
const soft = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), softMat);
soft.position.set(0, 6.5, 5.5);
soft.lookAt(0, 0, 0);
room.add(soft);
await breathe();
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.55;
pmrem.dispose();
await breathe();

const key = new THREE.DirectionalLight(0xfaf7f0, 1.5);
key.position.set(4, 6, 6);
scene.add(key);
// a rim light from behind and above: it catches the gold edge and draws the card's outline
const rim = new THREE.DirectionalLight(0xffe2b0, 2.4);
rim.position.set(-3, 6, -7);
scene.add(rim);


/* ---------- geometry helpers ---------- */
function rrect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function slab(w, h, r, t) {
  const g = new THREE.ExtrudeGeometry(rrect(w, h, r), { depth: t, bevelEnabled: true, bevelThickness: t * 0.18, bevelSize: 0.012, bevelSegments: 3, curveSegments: 28 });
  g.center();
  return g;
}
function facePlane(w, h, r) {
  const g = new THREE.ShapeGeometry(rrect(w, h, r), 28);
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / w + 0.5; uv[2 * i + 1] = p.getY(i) / h + 0.5; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
// the Reputra mark: a tap (the dot) and the ripple it sends (the arc)
function markShapes(r) {
  const dot = new THREE.Shape().absarc(0, 0, r * 0.36, 0, Math.PI * 2, false);
  const a = THREE.MathUtils.degToRad(50), ro = r * 1.13, ri = r * 0.87, cap = r * 0.13;
  const arc = new THREE.Shape();
  arc.absarc(0, 0, ro, -a, a, false);
  arc.absarc(Math.cos(a) * r, Math.sin(a) * r, cap, a, a + Math.PI, false);
  arc.absarc(0, 0, ri, a, -a, true);
  arc.absarc(Math.cos(a) * r, -Math.sin(a) * r, cap, -a + Math.PI, -a + Math.PI * 2, false);
  return [dot, arc];
}
function drawMark(g, x, y, r, dotColor, arcColor) {
  g.fillStyle = dotColor;
  g.beginPath(); g.arc(x, y, r * 0.36, 0, Math.PI * 2); g.fill();
  g.strokeStyle = arcColor; g.lineWidth = r * 0.26; g.lineCap = "round";
  g.beginPath(); g.arc(x, y, r, -0.873, 0.873); g.stroke();
}
function textureFrom(draw, w = 2048, h = 1292) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// the card is printed in the page's typeface, but it never waits long for it
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);

/* ---------- the card: ID-1, 85.6 × 54 mm, one unit = 1 cm ---------- */
const W = 8.56, H = 5.4, R = 0.32;
const sans = getComputedStyle(document.body).getPropertyValue("--sans") || "Arial, sans-serif";
const MARK = { x: 2.2, y: 0.2, r: 1 }; // where the foil mark sits on the face

// The face carries one engraving: nine thick, irregular bands spreading from the tap mark, like the
// ripples of a tap on water. Drawn three times from the same paths: as a faint tone in the print, as
// gloss in a matte field (spot varnish), and as grooves (the engraving itself).
const BANDS = 9;
function bandPath(g, mx, my, i, k, inset = 0) {
  const base = (250 + i * 165) * k - inset;
  g.beginPath();
  for (let s = 0; s <= 720; s++) {
    const t = (s / 720) * Math.PI * 2;
    const r = base + (26 * Math.sin(7 * t + i * 0.6) + 11 * Math.sin(17 * t - i * 0.45)) * k * (0.6 + i * 0.08);
    const x = mx + Math.cos(t) * r, y = my + Math.sin(t) * r;
    s ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
function engraving(g, w, h, paint) {
  const k = w / 2048, mx = (MARK.x / W + 0.5) * w, my = (0.5 - MARK.y / H) * h;
  for (let i = 0; i < BANDS; i++) {
    paint(g, Math.max(0.25, 1 - i / BANDS), k);
    bandPath(g, mx, my, i, k);
    g.stroke();
  }
}
function canvasOf(w, h, fill) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = fill; g.fillRect(0, 0, w, h);
  return [c, g];
}

// the print: very little, as on a good card. The mark and name, one quiet line, the engraving's tone.
const frontTex = textureFrom((g, w, h) => {
  g.fillStyle = INK; g.fillRect(0, 0, w, h);
  // tone on tone: each ring a shade lighter than the black, with a fine highlight on its inner edge
  engraving(g, w, h, (g, fade, k) => { g.lineWidth = 28 * k; g.strokeStyle = `rgba(255,255,255,${(0.1 * fade).toFixed(3)})`; });
  const mx = (MARK.x / W + 0.5) * w, my = (0.5 - MARK.y / H) * h;
  for (let i = 0; i < BANDS; i++) {
    g.lineWidth = 2.5; g.strokeStyle = `rgba(255,255,255,${(0.18 * Math.max(0.25, 1 - i / BANDS)).toFixed(3)})`;
    bandPath(g, mx, my, i, 1, 14); g.stroke(); // the lit edge of each groove
  }
  drawMark(g, 196, 236, 40, AMBER, "rgba(226,228,232,0.95)");
  g.fillStyle = "rgba(226,228,232,0.95)";
  g.font = `600 100px ${sans}`;
  g.letterSpacing = "-4px";
  g.fillText("reputra", 268, 271);
  g.letterSpacing = "7px";
  g.fillStyle = "rgba(226,228,232,0.5)";
  g.font = `500 40px ${sans}`;
  g.fillText("TAP TO REVIEW ON GOOGLE", 156, h - 150);
  g.letterSpacing = "0px";
});
// spot varnish: the engraved lines glossy (dark = smooth), the field soft-touch matte (light = rough)
function varnishMap() {
  const [c, g] = canvasOf(1024, 646, "rgb(245,245,245)");
  engraving(g, c.width, c.height, (g, fade, k) => { g.lineWidth = 28 * k; g.strokeStyle = `rgba(18,18,18,${(0.6 + 0.4 * fade).toFixed(3)})`; });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
// where the face may reflect at all: the varnished lines fully, the matte field barely (alpha channel)
function shineMask() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 646;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "copy";
  engraving(g, c.width, c.height, (g, fade, k) => { g.lineWidth = 28 * k; g.strokeStyle = `rgba(255,255,255,${(0.55 + 0.45 * fade).toFixed(3)})`; });
  // "copy" clears what each stroke does not cover, so draw the field back underneath
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(0, 0, c.width, c.height);
  return new THREE.CanvasTexture(c);
}
// the engraving: shallow grooves along the same lines, as a normal map
function engraveMap() {
  const [c, g] = canvasOf(1024, 646, "rgb(128,128,128)");
  g.filter = "blur(2.5px)"; // soft walls, so the grooves read as cut, not stamped
  engraving(g, c.width, c.height, (g, fade, k) => { g.lineWidth = 28 * k; g.strokeStyle = `rgba(60,60,60,${(0.5 + 0.5 * fade).toFixed(3)})`; });
  g.filter = "none";
  const w = c.width, h = c.height, src = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), d = out.data, s = 2.2 / 255;
  for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 255; d[i + 3] = 255; }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4;
    const dx = (src[i + 4] - src[i - 4]) * s, dy = (src[i + w * 4] - src[i - w * 4]) * s;
    const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    d[i] = (-dx * l * 0.5 + 0.5) * 255; d[i + 1] = (dy * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

const backTex = textureFrom((g, w, h) => {
  g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
  // decorative QR (not scannable): finder squares and a seeded field
  const n = 25, size = 760, x0 = 170, y0 = (h - size) / 2, cell = size / n;
  let seed = 11; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = INK;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
    if (!finder && rnd() > 0.5) g.fillRect(x0 + x * cell, y0 + y * cell, cell + 0.5, cell + 0.5);
  }
  const fp = (fx, fy) => { g.fillStyle = INK; g.fillRect(x0 + fx * cell, y0 + fy * cell, 7 * cell, 7 * cell); g.fillStyle = PAPER; g.fillRect(x0 + (fx + 1) * cell, y0 + (fy + 1) * cell, 5 * cell, 5 * cell); g.fillStyle = INK; g.fillRect(x0 + (fx + 2) * cell, y0 + (fy + 2) * cell, 3 * cell, 3 * cell); };
  fp(0, 0); fp(18, 0); fp(0, 18);
  g.fillStyle = INK;
  g.font = `600 88px ${sans}`;
  g.letterSpacing = "-3px";
  g.fillText("No NFC? Scan this.", 1060, h / 2 - 30);
  g.letterSpacing = "0px";
  g.fillStyle = "rgba(12,13,16,0.55)";
  g.font = `500 48px ${sans}`;
  g.fillText("reputra.pk/r/your-business", 1064, h / 2 + 60);
});

/* ---------- the tap card ---------- */
const card = new THREE.Group();
scene.add(card);
const layers = [];
function addLayer(name, z, build) {
  const g = new THREE.Group();
  g.name = name;
  build(g);
  g.position.set(0, 0, z);
  card.add(g);
  layers.push(g);
  return g;
}

// the face: soft-touch black, engraved bands in spot gloss, a gold edge, the mark in amber foil
const faceMat = new THREE.MeshPhysicalMaterial({
  map: frontTex, metalness: 0, roughness: 1, envMapIntensity: 1.4, // soft-touch field; the varnish map adds the gloss
});
// the varnish and the engraving are built with the material (this module loads after the hero's opening),
// so the shaders are compiled once, complete, before the first frame
await breathe();
faceMat.roughnessMap = varnishMap();
await breathe();
faceMat.specularIntensityMap = shineMask();
await breathe();
faceMat.normalMap = engraveMap();
await breathe();
faceMat.normalScale = new THREE.Vector2(1.1, 1.1);
const faceBody = new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.95, envMapIntensity: 0.55 });
const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 });
addLayer("face", 0.05, (g) => {
  const body = new THREE.Mesh(slab(W, H, R, 0.03), [faceBody, gold]); // caps, then the sides
  const print = new THREE.Mesh(facePlane(W - 0.02, H - 0.02, R), faceMat);
  print.position.z = 0.023; // clear of the body's bevel; the deep near plane keeps them apart
  const foil = new THREE.Mesh(
    new THREE.ExtrudeGeometry(markShapes(MARK.r), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 }),
    new THREE.MeshPhysicalMaterial({ color: AMBER, metalness: 0.2, roughness: 0.6, emissive: AMBER, emissiveIntensity: 0.1, envMapIntensity: 0.6, specularIntensity: 0.4 }),
  );
  foil.position.set(MARK.x, MARK.y, 0.026);
  g.add(body, print, foil);
});
// the white core, with the QR code printed on its back
addLayer("core", -0.02, (g) => {
  g.add(new THREE.Mesh(slab(W, H, R, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xededeb, roughness: 0.7, clearcoat: 0.2 })));
  const print = new THREE.Mesh(facePlane(W - 0.02, H - 0.02, R), new THREE.MeshPhysicalMaterial({ map: backTex, roughness: 0.62, clearcoat: 0.25 }));
  print.position.z = -0.035;
  print.rotation.y = Math.PI;
  g.add(print);
});
// the shockwaves of the tap
const rings = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.3, 128), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(MARK.x, MARK.y, 0.2);
  card.add(m);
  return m;
});

await breathe();
/* ---------- the counter stand: a clear acrylic plate in a black base, QR and tap on one face ----------
   Like the QR stands at every till in Pakistan, made heavier: 10 × 14 cm of 5 mm acrylic. */
const SW = 9.6, SH = 13.6, ST = 0.5, BASE_H = 1.5, BASE_D = 4.2, SLOT = 0.6;
const STAND_H = BASE_H + SH - SLOT; // overall height, for sizing on screen
const standTex = textureFrom((g, w, h) => {
  g.fillStyle = INK; g.fillRect(0, 0, w, h);
  // the same engraved bands as the card, quieter, rising from the tap mark near the foot
  const mx = w * 0.5, my = h * 0.86;
  for (let i = 0; i < 7; i++) {
    g.lineWidth = 22; g.strokeStyle = `rgba(255,255,255,${(0.05 * (1 - i / 7)).toFixed(3)})`;
    g.beginPath(); g.arc(mx, my, 150 + i * 120, 0, Math.PI * 2); g.stroke();
  }
  drawMark(g, 120, 130, 30, AMBER, "rgba(226,228,232,0.95)");
  g.fillStyle = "rgba(226,228,232,0.95)"; g.font = `600 64px ${sans}`; g.letterSpacing = "-3px";
  g.fillText("reputra", 172, 152);
  g.letterSpacing = "-2px"; g.fillStyle = "#f6f6f7"; g.font = `600 96px ${sans}`;
  g.fillText("Review us", 84, 330); g.fillText("on Google", 84, 430);
  g.letterSpacing = "0px"; g.fillStyle = "rgba(246,246,247,0.6)"; g.font = `500 40px ${sans}`;
  g.fillText("Thirty seconds. No app.", 88, 500);
  // the QR on a white tile
  const qs = 620, qx = (w - qs) / 2, qy = 570;
  g.fillStyle = "#f6f6f7"; g.beginPath(); g.roundRect(qx - 36, qy - 36, qs + 72, qs + 72, 40); g.fill();
  const n = 25, cell = qs / n;
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = INK;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
    if (!finder && rnd() > 0.5) g.fillRect(qx + x * cell, qy + y * cell, cell + 0.5, cell + 0.5);
  }
  const fp = (fx, fy) => { g.fillStyle = INK; g.fillRect(qx + fx * cell, qy + fy * cell, 7 * cell, 7 * cell); g.fillStyle = "#f6f6f7"; g.fillRect(qx + (fx + 1) * cell, qy + (fy + 1) * cell, 5 * cell, 5 * cell); g.fillStyle = INK; g.fillRect(qx + (fx + 2) * cell, qy + (fy + 2) * cell, 3 * cell, 3 * cell); };
  fp(0, 0); fp(18, 0); fp(0, 18);
  // the tap spot
  drawMark(g, mx - 150, my, 52, AMBER, AMBER);
  g.fillStyle = "#f6f6f7"; g.font = `600 46px ${sans}`; g.fillText("Scan, or tap", mx - 70, my - 6);
  g.fillStyle = "rgba(246,246,247,0.6)"; g.font = `500 36px ${sans}`; g.fillText("your phone here", mx - 70, my + 42);
}, 1100, 1590);
const stand = new THREE.Group();
scene.add(stand);
{
  // the base: a heavy black block with a gold line along its front edge
  const base = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.8, BASE_H, BASE_D, 1, 1, 1), new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.7 }));
  base.position.y = -STAND_H / 2 + BASE_H / 2;
  const line = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.82, 0.05, 0.05), gold);
  line.position.set(0, -STAND_H / 2 + BASE_H - 0.03, BASE_D / 2);
  // the plate, leaning back a little, as a stand does
  const plate = new THREE.Group();
  plate.position.y = -STAND_H / 2 + BASE_H - SLOT + SH / 2;
  plate.rotation.x = -0.08;
  const acrylic = new THREE.Mesh(slab(SW, SH, 0.5, ST), new THREE.MeshPhysicalMaterial({
    metalness: 0, roughness: 0.04, transmission: 1, thickness: ST, ior: 1.49,
    attenuationColor: new THREE.Color(0xe8eef3), attenuationDistance: 12, clearcoat: 1, clearcoatRoughness: 0.03,
    envMapIntensity: 0.9,
  }));
  const insert = new THREE.Mesh(facePlane(SW - 0.6, SH - 0.6, 0.3), new THREE.MeshPhysicalMaterial({ map: standTex, roughness: 0.6, envMapIntensity: 0.5 }));
  insert.position.z = ST / 2 + 0.1; // the print on the front face (seen through glass it would render soft)
  plate.add(acrylic, insert);
  stand.add(base, line, plate);
  stand.userData.tap = new THREE.Vector3(0, plate.position.y + (0.5 - 0.86) * (SH - 0.6), 0.4);
}

await breathe();
/* ---------- choreography ---------- */
const clamp = (v) => Math.min(1, Math.max(0, v));
const sub = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const inOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

let mobile = matchMedia("(max-width: 760px)").matches;
let vw = 1, vh = 1;
let mode = "stage"; // the one canvas lives in the stage, or travels to the closing section
const TAN = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const DIST = 40;
camera.position.set(0, 0, DIST);
const unit = () => (TAN * DIST) / vh; // world units per CSS pixel on the z = 0 plane

// Each beat places the two objects on screen: [x, y] as fractions of the stage, and a size. On a desk both are
// sized by the stage height, so a wide screen never makes the card outgrow the stand; on a phone the card goes by width.
const BEATS = {
  desk: {
    stand: [[0.66, 0.54, 0.68], [0.52, 0.55, 0.6], [0.86, 0.64, 0.42], [1.35, 0.6, 0.42]],
    card: [[1.2, 0.7, 0.43], [0.78, 0.68, 0.43], [0.8, 0.86, 0.24], [0.64, 0.54, 0.66]],
  },
  phone: {
    stand: [[0.5, 0.5, 0.44], [0.34, 0.5, 0.38], [1.4, 0.46, 0.3], [-0.6, 0.6, 0.3]],
    card: [[1.4, 0.62, 0.6], [0.72, 0.6, 0.5], [1.5, 0.6, 0.4], [0.5, 0.56, 0.8]],
  },
};
function place(obj, [cx, cy, size], natural, byWidth) {
  const u = unit(), px = byWidth ? size * vw : size * vh;
  obj.position.set((cx - 0.5) * vw * u, (0.5 - cy) * vh * u, 0);
  obj.scale.setScalar((px * u) / natural);
}
function mix(a, b, t) { return a.map((v, i) => lerp(v, b[i], t)); }
function shotAt(list, t1, t2, t3) {
  return mix(mix(mix(list[0], list[1], t1), list[2], t2), list[3], t3);
}

function writeScene(p, tilt) {
  // 0.00–0.28  at the counter: the stand, slowly turning to you
  // 0.24–0.46  at the till: the tap card comes in beside it
  // 0.44–0.66  on WhatsApp: both step back; the message takes the front
  // 0.66–0.78  one page: the card comes to the centre for the tap; the stand steps away
  // 0.78–0.86  the tap: a small press, three shockwaves, five stars
  // 0.86–1.00  the ripple becomes the page
  const b = mobile ? BEATS.phone : BEATS.desk;
  const t1 = inOutCubic(sub(p, 0.24, 0.36)), t2 = inOutCubic(sub(p, 0.44, 0.54)), t3 = inOutCubic(sub(p, 0.66, 0.78));
  place(stand, shotAt(b.stand, t1, t2, t3), STAND_H, false);
  const cardShot = shotAt(b.card, t1, t2, t3);
  const press = sub(p, 0.795, 0.81), rebound = sub(p, 0.81, 0.84);
  cardShot[2] *= 1 - 0.035 * Math.sin((press * Math.PI) / 2) * (1 - outBack(rebound));
  place(card, cardShot, W, mobile);

  // the stand turns slowly, so the acrylic catches the light; the card turns in, then squares up for the tap
  stand.rotation.set(-0.06 + tilt.y * 0.05, -0.42 + p * 0.5 + tilt.x * 0.12, 0);
  const face = 1 - 0.65 * t3;
  card.rotation.set((-0.34 + tilt.y * 0.16) * face, (-0.5 + 0.2 * t1 + tilt.x * 0.26) * face, 0.06 * face);

  rings.forEach((m, i) => {
    const r = sub(p, 0.8 + i * 0.012, 0.86 + i * 0.012);
    m.material.opacity = r > 0 && r < 1 ? 0.95 * (1 - r) ** 1.5 : 0;
    m.scale.setScalar(0.3 + outExpo(r) * (4 + i * 2.2));
  });
  card.updateMatrixWorld();
  stand.updateMatrixWorld();
  camera.updateMatrixWorld();
}

// at the end of the page the stand and the card come back to rest beside the last line, and answer the button
function writeClose(t, tilt, pulse) {
  const shotStand = mobile ? [0.36, 0.52, 0.86] : [0.42, 0.52, 0.86];
  const shotCard = mobile ? [0.66, 0.68, 0.5] : [0.66, 0.66, 0.6];
  place(stand, shotStand, STAND_H, false);
  const press = pulse >= 0 && pulse < 0.4 ? Math.sin((pulse / 0.4) * Math.PI) : 0;
  shotCard[2] *= 1 - 0.03 * press;
  place(card, shotCard, W, mobile);
  stand.rotation.set(-0.04 + tilt.y * 0.05, -0.3 + tilt.x * 0.18 + Math.sin(t * 0.3) * 0.04, 0);
  card.position.y += Math.sin(t * 0.7) * 0.06 * card.scale.x;
  card.rotation.set(-0.3 + tilt.y * 0.2 + Math.sin(t * 0.5) * 0.025, -0.36 + tilt.x * 0.32, 0.05);
  rings.forEach((m, i) => {
    const r = pulse >= 0 ? clamp((pulse - 0.12 - i * 0.16) / 1.2) : 0;
    m.material.opacity = r > 0 && r < 1 ? 0.85 * (1 - r) ** 1.6 : 0;
    m.scale.setScalar(0.3 + outExpo(r) * (1.5 + i * 0.6));
  });
  card.updateMatrixWorld();
  stand.updateMatrixWorld();
  camera.updateMatrixWorld();
}

// Face-on, even a matte black picks up the studio behind the camera and reads grey; a photographer
// flags that light. Here the fill eases off as the card turns square to the lens.
const faceNormal = new THREE.Vector3();
function flagTheLight() {
  faceNormal.set(0, 0, 1).applyQuaternion(card.quaternion);
  const square = Math.min(1, Math.max(0, (faceNormal.z - 0.8) / 0.18));
  faceMat.envMapIntensity = 1.4 * (1 - 0.6 * square);
  faceBody.envMapIntensity = 0.55 * (1 - 0.7 * square);
  key.intensity = 1.5 * (1 - 0.75 * square);
}

/* ---------- the page around the scene ---------- */
const v = new THREE.Vector3();
const stageTitle = document.querySelector(".stage__title");
const worldEl = document.querySelector("[data-world]");
const stars = [...document.querySelectorAll("[data-burst] i")];
const wipe = document.querySelector("[data-wipe]");
const markPoint = new THREE.Vector3(MARK.x, MARK.y, 0.06);
const origin = new THREE.Vector3();
function screenOf(obj, point) {
  v.copy(point).applyMatrix4(obj.matrixWorld).project(camera);
  return [(v.x * 0.5 + 0.5) * vw, (-v.y * 0.5 + 0.5) * vh];
}
function fade(el, inA, inB, outA, outB, lift = 22) {
  const a = sub(shown, inA, inB), z = outA == null ? 0 : sub(shown, outA, outB);
  el.style.opacity = (a * (1 - z)).toFixed(3);
  el.style.transform = `translateY(${((1 - a) * lift - z * lift).toFixed(1)}px)`;
  el.style.visibility = a * (1 - z) > 0.01 ? "visible" : "hidden";
}
function layoutPage(p) {
  fade(stageTitle, -1, 0.03, 0.62, 0.68, 16);
  const win = [[0.02, 0.06, 0.22, 0.26], [0.26, 0.3, 0.42, 0.46], [0.46, 0.5, 0.62, 0.66]];
  beats.forEach((el, i) => fade(el, ...win[i]));
  fade(waChat, 0.47, 0.53, 0.63, 0.68, 40);
  fade(closing, 0.68, 0.72, 0.77, 0.8);

  // the pool of light follows whichever object leads
  const [sx, sy] = screenOf(stand, origin), [cx, cy] = screenOf(card, origin);
  const lead = sub(p, 0.24, 0.36) * 0.5 + sub(p, 0.66, 0.78) * 0.5;
  pinEl.style.setProperty("--p", p.toFixed(3)); // the map behind drifts with the scroll
  worldEl?.style.setProperty("--lx", `${lerp(sx, cx, lead).toFixed(1)}px`);
  worldEl?.style.setProperty("--ly", `${lerp(sy, cy, lead).toFixed(1)}px`);

  // five stars burst from the card's mark and land in a row above it
  const [mx, my] = screenOf(layers[0], markPoint);
  const s = mobile ? 34 : 50;
  const rx = Math.min(Math.max(mx, s * 4), vw - s * 4); // the row stays on screen
  stars.forEach((el, i) => {
    const k = sub(p, 0.805 + i * 0.006, 0.84 + i * 0.006), e = outBack(k);
    const tx = (i - 2) * s * 1.3, ty = -(mobile ? 150 : 230) - (4 - (i - 2) ** 2) * s * 0.12;
    el.style.transform = `translate(${(mx + (rx - mx + tx) * e).toFixed(1)}px, ${(my + ty * e).toFixed(1)}px) scale(${(0.2 + 0.8 * Math.min(1, e)).toFixed(3)}) rotate(${((1 - e) * -140).toFixed(1)}deg)`;
    el.style.opacity = (k > 0 ? Math.min(1, k * 4) : 0).toFixed(3);
  });

  // and the ripple becomes the page
  const w = inOutCubic(sub(p, 0.86, 0.985));
  const far = Math.hypot(Math.max(mx, vw - mx), Math.max(my, vh - my));
  wipe.style.clipPath = `circle(${(w * far).toFixed(1)}px at ${mx.toFixed(1)}px ${my.toFixed(1)}px)`;
  wipe.style.setProperty("--k", sub(p, 0.93, 0.99).toFixed(3));
  const opened = w > 0.6;
  if (opened !== document.documentElement.classList.contains("stage-opened")) {
    document.documentElement.classList.toggle("stage-opened", opened);
    dispatchEvent(new Event("stagechange")); // the nav changes tone with the page under it
  }
}

/* ---------- size ---------- */
function resize() {
  vw = canvas.clientWidth; vh = canvas.clientHeight;
  mobile = matchMedia("(max-width: 760px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

/* ---------- one progress number ---------- */
let target = 0, shown = 0;
let awake = false, ready = false; // the render loop: asleep until there is something to draw (see wake)
const tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
if (!reduced) {
  addEventListener("pointermove", (e) => {
    tiltTarget.x = (e.clientX / innerWidth) * 2 - 1;
    tiltTarget.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
}

if (reduced || !window.gsap) {
  target = shown = 0.3; // a still frame: the stand and the card together
} else {
  gsap.registerPlugin(ScrollTrigger);
  window.__stage = ScrollTrigger.create({ // the nav reads this to land inside the film, not past it
    trigger: stageEl,
    start: "top top",
    end: () => `+=${innerHeight * (mobile ? 4.2 : 4.6)}`,
    pin: pinEl,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => { target = self.progress; wake(); },
  });
}
const closeHome = document.querySelector("[data-close-stage]");
let stageVisible = false, closeVisible = false, pulseAt = -1;
new IntersectionObserver(([e]) => { stageVisible = e.isIntersecting; wake(); }, { rootMargin: "-1px 0px" }).observe(stageEl); // touching the edge is not on screen
if (closeHome) {
  let greeted = false;
  new IntersectionObserver(([e]) => {
    closeVisible = e.isIntersecting;
    wake();
    if (closeVisible && !greeted) { greeted = true; pulseAt = performance.now() / 1000 + 0.6; } // one tap, on arrival
  }, { rootMargin: "120px 0px" }).observe(closeHome);
  document.querySelectorAll(".close .btn").forEach((b) => {
    const tap = () => { pulseAt = performance.now() / 1000; };
    b.addEventListener("pointerenter", tap);
    b.addEventListener("focus", tap);
  });
}
function setMode(next) {
  if (next === mode) return;
  mode = next;
  (next === "close" ? closeHome : pinEl).prepend(canvas);
  resize();
  fresh = 2;
}

const K = 0.12;
let last = performance.now(), fresh = 2; // frames still owed after a mode change or resize
// the loop sleeps when there is nothing to draw, and anything that could change the picture wakes it
function wake() { if (awake || !ready) return; awake = true; last = performance.now(); renderer.setAnimationLoop(loop); }
const sleep = () => { awake = false; renderer.setAnimationLoop(null); };
addEventListener("resize", () => { fresh = 2; wake(); });
addEventListener("pointermove", () => wake(), { passive: true });
const settled = () => Math.abs(target - shown) < 1e-5 && Math.abs(tiltTarget.x - tilt.x) < 1e-4 && Math.abs(tiltTarget.y - tilt.y) < 1e-4;
const loop = (now) => {
  // the first frame can carry a timestamp from before this script ran: never step backwards
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
  last = now;
  const next = closeVisible && closeHome ? "close" : stageVisible ? "stage" : null;
  if (!next) { sleep(); return; }
  setMode(next);
  // the stage is a pure function of scroll and tilt: once both have settled, the last frame is still true
  if (mode === "stage" && settled() && fresh <= 0) { sleep(); return; }
  fresh--;
  const f = 1 - Math.pow(1 - K, dt * 60);
  tilt.x += (tiltTarget.x - tilt.x) * f * 0.5;
  tilt.y += (tiltTarget.y - tilt.y) * f * 0.5;
  const t = now / 1000;
  if (mode === "stage") {
    shown += (target - shown) * f;
    writeScene(shown, tilt);
  } else {
    writeClose(t, tilt, pulseAt >= 0 ? t - pulseAt : -1);
  }
  flagTheLight();
  renderer.render(scene, camera);
  if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
  if (mode === "stage") layoutPage(shown);
};
// every shader is compiled off the main thread where the browser allows it, before the first frame:
// arriving at the stage never stalls the page
(renderer.compileAsync ? renderer.compileAsync(scene, camera).catch(() => {}) : Promise.resolve())
  .then(() => { ready = true; wake(); });
