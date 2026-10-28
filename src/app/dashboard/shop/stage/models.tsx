"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { createPrintTexture, INK, paintPrint, type PrintKind } from "./artwork";

// The three products, modelled in millimetres and scaled into the stage, where one unit is 10 cm.
// Each sits at its own three-quarter angle with the printed face towards the light. A product's
// geometry, materials and print are built the first time it is shown and kept for the session.

export type ProductProps = {
  businessName: string;
  font: string;
  lite: boolean;
};

/** Where every product's contact shadow lies, in stage units. */
export const FLOOR_Y = -0.86;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** A rounded slab `t` thick whose outer edge (bevel included) is exactly w × h, centred on the origin. */
function slab(w: number, h: number, r: number, t: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(
    roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.01, r - bevel)),
    {
      depth: Math.max(0.001, t - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 10,
    },
  );
  g.center();
  return g;
}

/** A flat print in the shape `shape`, with UVs normalised to its bounding box (0..1). */
function printFace(
  shape: THREE.Shape | null,
  w: number,
  h: number,
  segments = 12,
) {
  const g = shape
    ? new THREE.ShapeGeometry(shape, segments)
    : new THREE.CircleGeometry(w / 2, 96);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / w + 0.5;
    uv[i * 2 + 1] = p.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Creates three.js resources once and disposes them when the component unmounts. */
function useDisposable<T extends Record<string, { dispose: () => void }>>(
  make: () => T,
): T {
  const [res] = useState(make);
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res]);
  return res;
}

/** One product's print: created with the product, repainted in the same commit when the name
 *  changes (so a frame never shows the old one), disposed with it. */
function usePrint(kind: PrintKind, businessName: string, font: string) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [map] = useState(() => createPrintTexture(kind));
  useLayoutEffect(() => {
    paintPrint(
      map,
      kind,
      businessName,
      font,
      Math.min(8, gl.capabilities.getMaxAnisotropy()),
    );
    invalidate();
  }, [map, kind, businessName, font, gl, invalidate]);
  useEffect(() => () => map.dispose(), [map]);
  return map;
}

/** Clear acrylic without transmission: a tinted, glossy, see-through sheet. For slow GPUs. */
function liteAcrylic(opacity: number) {
  return new THREE.MeshStandardMaterial({
    color: "#eef5f3",
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: false,
    envMapIntensity: 1.4,
  });
}

function acrylic(thickness: number, depthWrite = true) {
  return new THREE.MeshPhysicalMaterial({
    depthWrite,
    color: "#ffffff",
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness,
    ior: 1.49,
    attenuationColor: new THREE.Color("#cfe8e2"),
    attenuationDistance: 40,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.2,
  });
}

function printMaterial(
  map: THREE.Texture,
  o: {
    roughness: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    polygonOffset?: boolean;
    lift?: number;
    transparent?: boolean;
  },
) {
  return new THREE.MeshPhysicalMaterial({
    map,
    transparent: o.transparent ?? false,
    // a little of the print's own colour as emission, so paper reads as paper, not grey card
    emissiveMap: map,
    emissive: new THREE.Color(o.lift ? "#ffffff" : "#000000"),
    emissiveIntensity: o.lift ?? 0,
    roughness: o.roughness,
    metalness: 0,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: o.clearcoatRoughness ?? 0.3,
    polygonOffset: o.polygonOffset ?? true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

/** Walnut, drawn once: a warm base, long wavy grain lines and a little pore noise. It tiles in
 *  both directions (every wave fits a whole number of times across), so the slab can repeat it. */
function walnutTexture(anisotropy: number) {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#6f4a2c");
  base.addColorStop(0.5, "#7a5232");
  base.addColorStop(1, "#6a452a");
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  // broad bands of heartwood, then fine grain on top
  for (let pass = 0; pass < 2; pass++) {
    const lines = pass === 0 ? 26 : 150;
    for (let i = 0; i < lines; i++) {
      const y0 = rnd() * H;
      const amp = (pass === 0 ? 10 : 3) + rnd() * (pass === 0 ? 14 : 6);
      const cycles = 1 + Math.floor(rnd() * 3);
      const phase = rnd() * Math.PI * 2;
      const dark = rnd() < 0.72;
      g.strokeStyle = dark
        ? `rgba(46,26,12,${pass === 0 ? 0.1 + rnd() * 0.12 : 0.06 + rnd() * 0.16})`
        : `rgba(178,128,82,${0.05 + rnd() * 0.1})`;
      g.lineWidth = pass === 0 ? 6 + rnd() * 14 : 0.6 + rnd() * 1.8;
      for (const dy of [-H, 0, H]) {
        g.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y =
            y0 +
            dy +
            Math.sin((x / W) * Math.PI * 2 * cycles + phase) * amp +
            Math.sin((x / W) * Math.PI * 2 * (cycles + 3) + phase * 2) *
              amp *
              0.25;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  }
  // pores
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(30,16,6,${0.04 + rnd() * 0.08})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 0.6);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 150, 1 / 75); // the slab's UVs are in millimetres: one tile is 15 × 7.5 cm
  t.anisotropy = anisotropy;
  return t;
}

/* ------------------------------------------------------------------ stand */
// A clear acrylic T-stand: a 100 × 150 mm card held between two 3 mm sheets, seated in a 12 mm
// oiled walnut base with a slot cut for the acrylic.

export function Stand({ businessName, font, lite }: ProductProps) {
  const map = usePrint("stand", businessName, font);
  const gl = useThree((s) => s.gl);
  const r = useDisposable(() => {
    const wood = walnutTexture(Math.min(8, gl.capabilities.getMaxAnisotropy()));
    return {
      base: slab(124, 74, 3.2, 12, 1.4).rotateX(Math.PI / 2),
      sheet: slab(110, 160, 2.4, 3, 0.9),
      insertGeo: new THREE.PlaneGeometry(100, 150),
      wood,
      // hand-oiled: a soft satin sheen, the grain still reading through it
      woodMat: new THREE.MeshPhysicalMaterial({
        map: wood,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.45,
        sheen: 0.2,
        sheenColor: new THREE.Color("#c99a6b"),
      }),
      woodLite: new THREE.MeshStandardMaterial({
        map: wood,
        roughness: 0.55,
        metalness: 0,
      }),
      slotGeo: new THREE.PlaneGeometry(113, 7.6).rotateX(-Math.PI / 2),
      slotMat: new THREE.MeshBasicMaterial({
        color: "#1f130a",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
      // The sheets refract, but refraction is sampled from a resolved, filtered copy of the scene,
      // which would soften the print. So the card is drawn after the acrylic (transparent pass, fully
      // opaque) and stays as crisp as the texture; a reflections-only layer then puts the glass back on top.
      sheetMat: acrylic(3, false),
      printMat: printMaterial(map, {
        roughness: 0.62,
        polygonOffset: false,
        lift: 0.3,
        transparent: true,
      }),
      // on a slow GPU: no transmission pass at all
      sheetLite: liteAcrylic(0.12),
      glareGeo: new THREE.PlaneGeometry(104, 154),
      glareMat: new THREE.MeshPhysicalMaterial({
        color: "#000000",
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
  });
  return (
    <group position={[0, FLOOR_Y, 0]} rotation={[0, -0.52, 0]} scale={0.01}>
      <mesh
        geometry={r.base}
        material={lite ? r.woodLite : r.woodMat}
        position={[0, 6, 0]}
      />
      <mesh
        geometry={r.slotGeo}
        material={r.slotMat}
        position={[0, 12.05, 0]}
      />
      <mesh
        geometry={r.sheet}
        material={lite ? r.sheetLite : r.sheetMat}
        position={[0, 90, 2.25]}
      />
      <mesh
        geometry={r.sheet}
        material={lite ? r.sheetLite : r.sheetMat}
        position={[0, 90, -2.25]}
      />
      {/* the printed card, double-sided so the back reads too */}
      <mesh
        geometry={r.insertGeo}
        material={r.printMat}
        position={[0, 91, 0.3]}
      />
      <mesh
        geometry={r.insertGeo}
        material={r.printMat}
        position={[0, 91, -0.3]}
        rotation={[0, Math.PI, 0]}
      />
      <mesh
        geometry={r.glareGeo}
        material={r.glareMat}
        position={[0, 90, 3.8]}
      />
      <mesh
        geometry={r.glareGeo}
        material={r.glareMat}
        position={[0, 90, -3.8]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ card */
// ID-1: 85.6 × 54 mm, 0.76 mm thick, 3.18 mm corners. Ink core, satin-varnished print.

export function Card({ businessName, font }: ProductProps) {
  const front = usePrint("card", businessName, font);
  const back = usePrint("cardBack", "", font);
  const W = 85.6;
  const H = 54;
  const T = 0.76;
  const r = useDisposable(() => ({
    body: slab(W, H, 3.18, T, 0.14),
    face: printFace(roundedRect(W - 0.2, H - 0.2, 3.08), W - 0.2, H - 0.2),
    edgeMat: new THREE.MeshPhysicalMaterial({
      color: INK,
      roughness: 0.34,
      metalness: 0.1,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
    frontMat: printMaterial(front, {
      roughness: 0.46,
      clearcoat: 0.55,
      clearcoatRoughness: 0.24,
    }),
    backMat: printMaterial(back, {
      roughness: 0.5,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
    }),
  }));
  return (
    <group
      position={[0, 0.02, 0]}
      rotation={[-0.16, -0.44, 0.035]}
      scale={0.02}
    >
      <mesh geometry={r.body} material={r.edgeMat} />
      <mesh
        geometry={r.face}
        material={r.frontMat}
        position={[0, 0, T / 2 + 0.002]}
      />
      <mesh
        geometry={r.face}
        material={r.backMat}
        position={[0, 0, -T / 2 - 0.002]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ sticker */
// A 50 mm disc, 0.6 mm thick, gloss laminate over the print, a pale liner on the back.

export function Sticker({ businessName, font }: ProductProps) {
  const map = usePrint("sticker", businessName, font);
  const D = 50;
  const T = 0.6;
  const r = useDisposable(() => ({
    body: new THREE.CylinderGeometry(D / 2, D / 2, T, 96, 1).rotateX(
      Math.PI / 2,
    ),
    face: printFace(null, D - 0.1, D - 0.1),
    edgeMat: new THREE.MeshPhysicalMaterial({
      color: INK,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    }),
    frontMat: printMaterial(map, {
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
    linerMat: new THREE.MeshStandardMaterial({
      color: "#eceae4",
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  }));
  return (
    <group position={[0, 0.02, 0]} rotation={[-0.18, -0.46, 0]} scale={0.026}>
      <mesh geometry={r.body} material={r.edgeMat} />
      <mesh
        geometry={r.face}
        material={r.frontMat}
        position={[0, 0, T / 2 + 0.002]}
      />
      <mesh
        geometry={r.face}
        material={r.linerMat}
        position={[0, 0, -T / 2 - 0.002]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ refraction backdrop */
// The canvas is transparent, so the acrylic would refract nothing but a flat white. This soft grey
// studio sweep is drawn only into three's transmission pass (it writes no colour in the main pass),
// which gives the acrylic its darker edges and depth while the page behind stays the page.

export function RefractionBackdrop() {
  const r = useDisposable(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const g = c.getContext("2d");
    if (g) {
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#f5f5f6");
      grad.addColorStop(0.5, "#e7e8ea");
      grad.addColorStop(0.62, "#d2d3d6");
      grad.addColorStop(0.7, "#ebebed");
      grad.addColorStop(1, "#f3f3f4");
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 256);
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    // the floor: a soft pool of shade under the product, so the base refracts its own shadow
    const f = document.createElement("canvas");
    f.width = f.height = 256;
    const fg = f.getContext("2d");
    if (fg) {
      const rad = fg.createRadialGradient(128, 128, 0, 128, 128, 128);
      rad.addColorStop(0, "#bfc0c4");
      rad.addColorStop(0.35, "#dcdde0");
      rad.addColorStop(1, "#f3f3f4");
      fg.fillStyle = rad;
      fg.fillRect(0, 0, 256, 256);
    }
    const floorMap = new THREE.CanvasTexture(f);
    floorMap.colorSpace = THREE.SRGBColorSpace;
    return {
      map,
      floorMap,
      geo: new THREE.PlaneGeometry(16, 10),
      floorGeo: new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2),
      mat: new THREE.MeshBasicMaterial({
        map,
        toneMapped: false,
        depthWrite: false,
      }),
      floorMat: new THREE.MeshBasicMaterial({
        map: floorMap,
        toneMapped: false,
        depthWrite: false,
      }),
    };
  });
  const [hooks] = useState(
    () =>
      [transmissionPassOnly(r.mat), transmissionPassOnly(r.floorMat)] as const,
  );
  return (
    <>
      <mesh
        geometry={r.geo}
        material={r.mat}
        position={[0, 0.4, -3]}
        renderOrder={-2}
        onBeforeRender={hooks[0]}
      />
      {/* just under the floor line, so the contact shadow's upward camera never sees it */}
      <mesh
        geometry={r.floorGeo}
        material={r.floorMat}
        position={[0, FLOOR_Y - 0.01, 0]}
        renderOrder={-1}
        onBeforeRender={hooks[1]}
      />
    </>
  );
}

/** The main pass draws to the screen (no render target); the transmission pass draws off-screen. */
function transmissionPassOnly(mat: THREE.Material) {
  return (renderer: THREE.WebGLRenderer) => {
    mat.colorWrite = renderer.getRenderTarget() !== null;
  };
}
