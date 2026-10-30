"use client";

import { Component, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei/core/ContactShadows";
import { drawPrint, type ProductKind } from "./stage/artwork";
import { applyStudioEnvironment } from "./stage/environment";
import { Card, FLOOR_Y, RefractionBackdrop, Stand, Sticker } from "./stage/models";
import { ProductStageSkeleton } from "./product-stage-skeleton";

export type { ProductKind };

// The shop's product viewer: one product at a time on a soft studio floor, printed with the
// owner's business name. It follows a drag and settles back to its three-quarter view; after a
// switch or a drag it breathes for a few seconds, then stops. Rendering is on demand: a still
// product costs no frames at all. Switching is one continuous motion: the old product leaves
// quickly, the new one rises in on expo-out, and a switch mid-way picks up wherever it is.

const KINDS: readonly ProductKind[] = ["stand", "card", "sticker"];

const LABELS: Record<ProductKind, string> = {
  stand: "Acrylic counter stand",
  card: "NFC tap card",
  sticker: "Round NFC sticker",
};

/* ------------------------------------------------------------------ motion */

type Pose = { y: number; ry: number; s: number; o: number };
const REST: Pose = { y: 0, ry: 0, s: 1, o: 1 };
// A product settles onto the table from just above it and lifts slightly as it leaves. Never
// below: the contact shadow only sees what is above the floor, so a product rising from under it
// would get its shadow only at the very end.
const ENTER_FROM: Pose = { y: 0.09, ry: 0.55, s: 0.92, o: 0 };
const EXIT_TO: Pose = { y: 0.04, ry: -0.32, s: 0.96, o: 0 };

const ENTER_S = 0.55;
const EXIT_S = 0.2;
/** After the last switch or drag the product breathes for this long, then rendering stops. */
const BREATHE_S = 3;
/** Below this frame rate (sampled only while moving) the stage drops to 1x and fakes the acrylic. */
const SLOW_FRAME_S = 1 / 36;

const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const quadIn = (t: number) => t * t;
const lerpPose = (a: Pose, b: Pose, e: number): Pose => ({
  y: a.y + (b.y - a.y) * e,
  ry: a.ry + (b.ry - a.ry) * e,
  s: a.s + (b.s - a.s) * e,
  o: a.o + (b.o - a.o) * e,
});
/** Frame-rate independent exponential approach. */
const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt));
const nowS = () => performance.now() / 1000;

type Anim = {
  shown: ProductKind | null;
  phase: "idle" | "enter" | "exit" | "wait";
  t: number;
  dur: number;
  from: Pose;
  to: Pose;
  cur: Pose;
  warmed: Set<ProductKind>;
  warming: ProductKind | null;
  settledAt: number;
  time: number;
  amp: number;
  opacity: number;
  aspect: number;
  lastAt: number;
  prevMoving: boolean;
  samples: number;
  frameS: number;
  slowReported: boolean;
};

type Drag = { active: boolean; id: number; x: number; y: number; yaw: number; pitch: number; ry: number; rx: number; releasedAt: number };

/* ------------------------------------------------------------------ device */

function subscribeReduced(onChange: () => void) {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
const getReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getReducedOnServer = () => false;

/** Data Saver on, or 2 GB of memory or less: one still frame per product, 1x, no transmission. */
function detectLightDevice() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
}

/** The page's font family, once its faces have loaded (or after 2.5 s, whichever is first). */
function useStageFont() {
  const [font, setFont] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const loads = [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px ${family}`).catch(() => []));
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
    Promise.race([Promise.all([...loads, document.fonts.ready]), timeout]).then(() => {
      if (live) setFont(family);
    });
    return () => {
      live = false;
    };
  }, []);
  return font;
}

/* ------------------------------------------------------------------ scene */

function Scene({
  product,
  businessName,
  font,
  still,
  lite,
  active,
  onSlow,
  fadeRef,
  skeletonRef,
  dragRef,
  kickRef,
}: {
  product: ProductKind;
  businessName: string;
  font: string | null;
  still: boolean;
  lite: boolean;
  active: boolean;
  onSlow: () => void;
  fadeRef: RefObject<HTMLDivElement | null>;
  skeletonRef: RefObject<HTMLDivElement | null>;
  dragRef: RefObject<Drag>;
  kickRef: RefObject<() => void>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const cleanup = applyStudioEnvironment(gl, scene);
    invalidate();
    return cleanup;
  }, [gl, scene, invalidate]);

  // products are built the first time they are asked for, then kept
  const [mounted, setMounted] = useState<readonly ProductKind[]>([product]);
  if (!mounted.includes(product)) setMounted([...mounted, product]);

  // anything that changes the picture asks for a frame; the frame loop keeps asking while it moves
  useEffect(() => {
    kickRef.current = invalidate;
  }, [kickRef, invalidate]);
  useEffect(() => {
    if (active) invalidate();
  }, [active, product, font, still, lite, mounted, invalidate]);

  const poseRef = useRef<THREE.Group>(null);
  const turnRef = useRef<THREE.Group>(null);
  const idleRef = useRef<THREE.Group>(null);
  const standRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Group>(null);
  const stickerRef = useRef<THREE.Group>(null);
  const anim = useRef<Anim>({
    shown: null,
    phase: "idle",
    t: 0,
    dur: ENTER_S,
    from: ENTER_FROM,
    to: REST,
    cur: { ...ENTER_FROM },
    warmed: new Set(),
    warming: null,
    settledAt: 0,
    time: 0,
    amp: 0,
    opacity: -1,
    aspect: 0,
    lastAt: 0,
    prevMoving: false,
    samples: 0,
    frameS: 0,
    slowReported: false,
  });

  useFrame((state, rawDelta) => {
    const a = anim.current;
    const d = dragRef.current;
    const pose = poseRef.current;
    const turn = turnRef.current;
    const idle = idleRef.current;
    if (!pose || !turn || !idle) return;
    const now = nowS();
    // On demand, the clock runs on while nothing is drawn, so the first frame of a new motion would
    // see the whole pause as its delta (and a 200 ms exit would finish in one frame): start it at 1/60.
    // The frame after a warm-up (shader compile) is skipped over the same way.
    const delta = a.prevMoving && !a.warming ? rawDelta : 1 / 60;
    const dt = Math.min(delta, 0.1); // damping and the breathing clock
    const step = Math.min(delta, 0.25); // transitions keep to the wall clock even on a slow GPU
    let moving = false;

    // Frame time, sampled only between consecutive moving frames (on-demand gaps are not frames).
    if (a.prevMoving && !a.warming && !lite && !a.slowReported) {
      const ft = now - a.lastAt;
      if (ft > 0 && ft < 0.5) {
        a.samples++;
        a.frameS = a.samples === 1 ? ft : a.frameS + (ft - a.frameS) * 0.1;
        if (a.samples >= 24 && a.frameS > SLOW_FRAME_S) {
          a.slowReported = true;
          onSlow();
        }
      }
    }
    a.lastAt = now;

    // frame the stage: keep about 2.5 units of height and 2.4 of width in view
    const aspect = state.size.width / Math.max(1, state.size.height);
    if (Math.abs(aspect - a.aspect) > 0.001) {
      a.aspect = aspect;
      const t = Math.tan(THREE.MathUtils.degToRad(15));
      const dist = Math.max(2.5 / 2 / t, 2.4 / 2 / (t * aspect));
      state.camera.position.set(0, dist * 0.1, dist);
      state.camera.lookAt(0, -0.04, 0);
    }

    const groups: Record<ProductKind, THREE.Group | null> = { stand: standRef.current, card: cardRef.current, sticker: stickerRef.current };

    // A newly built product is drawn once at a speck's size, so its shaders compile and its print
    // uploads before it has to appear.
    if (a.warming) {
      a.warmed.add(a.warming);
      a.warming = null;
    }
    if (!a.warmed.has(product) && groups[product]) {
      a.warming = product;
      moving = true;
    }
    const ready = a.warmed.has(product);

    const startEnter = (from: Pose) => {
      a.phase = "enter";
      a.from = from;
      a.to = REST;
      a.t = 0;
      a.dur = ENTER_S * Math.max(0.35, 1 - from.o); // a reversal resumes mid-way, so it needs less time
    };
    const show = () => {
      a.shown = product;
      if (still) {
        a.phase = "idle";
        a.cur = { ...REST };
      } else {
        startEnter(ENTER_FROM);
        a.cur = { ...ENTER_FROM };
      }
    };

    if (a.shown === null || (still && product !== a.shown)) {
      if (ready) show();
    } else if (product !== a.shown) {
      if (a.phase === "wait") {
        if (ready) show();
      } else if (a.phase !== "exit") {
        a.phase = "exit";
        a.from = { ...a.cur };
        a.to = EXIT_TO;
        a.t = 0;
        a.dur = EXIT_S * Math.max(0.4, a.cur.o);
      }
    } else if (a.phase === "exit" || a.phase === "wait") {
      startEnter({ ...a.cur }); // switched back before the old one left: turn round mid-way
    }

    if (a.phase === "enter" || a.phase === "exit") {
      a.t = Math.min(1, a.t + step / a.dur);
      a.cur = lerpPose(a.from, a.to, a.phase === "enter" ? expoOut(a.t) : quadIn(a.t));
      if (a.t >= 1) {
        if (a.phase === "enter") {
          a.phase = "idle";
          a.cur = { ...REST };
          a.settledAt = now;
        } else if (ready) {
          show();
        } else {
          a.phase = "wait";
        }
      }
    }
    if (a.phase !== "idle") moving = true;

    for (const k of KINDS) {
      const g = groups[k];
      if (!g) continue;
      g.visible = k === a.shown || k === a.warming;
      g.scale.setScalar(k === a.shown ? 1 : 1e-4);
    }

    pose.position.y = a.cur.y;
    pose.rotation.y = a.cur.ry;
    pose.scale.setScalar(a.cur.s);
    const fade = fadeRef.current;
    if (fade && Math.abs(a.cur.o - a.opacity) > 0.002) {
      a.opacity = a.cur.o;
      fade.style.opacity = a.cur.o.toFixed(3);
    }
    // the loading placeholder stays until the first product arrives, and hands over to it
    const skeleton = skeletonRef.current;
    if (skeleton && a.cur.o > 0) {
      skeleton.style.opacity = (1 - a.cur.o).toFixed(3);
      if (a.cur.o >= 0.999) skeleton.style.display = "none";
    }

    // drag: follow the hand closely, settle back softly when let go
    const follow = d.active ? 16 : still ? 9 : 4.2;
    turn.rotation.y = damp(turn.rotation.y, d.active ? d.yaw : 0, follow, dt);
    turn.rotation.x = damp(turn.rotation.x, d.active ? d.pitch : 0, follow, dt);
    if (d.active || Math.abs(turn.rotation.y) > 1e-4 || Math.abs(turn.rotation.x) > 1e-4) moving = true;
    else turn.rotation.set(0, 0, 0);
    d.ry = turn.rotation.y;
    d.rx = turn.rotation.x;

    // breathing: a very slight sway (and, for the flat products, a float) that fades in after a
    // switch or a drag, fades out by BREATHE_S, and then lets rendering stop
    if (still) {
      a.amp = 0;
    } else {
      const since = now - Math.max(a.settledAt, d.releasedAt);
      const breathing = a.phase === "idle" && !d.active && since < BREATHE_S;
      const envelope = breathing ? Math.min(1, since / 0.8) : 0;
      a.amp = damp(a.amp, envelope, envelope > a.amp ? 3 : 6, step);
      if (!breathing && a.amp < 1e-3) a.amp = 0;
      else {
        a.time += dt;
        moving = true;
      }
    }
    idle.rotation.y = Math.sin(a.time * 0.6) * 0.06 * a.amp;
    idle.rotation.x = Math.sin(a.time * 0.43 + 1.1) * 0.014 * a.amp;
    idle.position.y = a.shown === "stand" ? 0 : Math.sin(a.time * 0.95) * 0.012 * a.amp;

    a.prevMoving = moving;
    if (moving) state.invalidate();
  });

  const props = font ? { businessName, font, lite } : null;
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[3, 5, 5]} intensity={1.9} color="#fffaf0" />
      <directionalLight position={[-3, 4, -6]} intensity={0.9} color="#fff4e2" />
      {!lite && <RefractionBackdrop />}

      <group ref={poseRef}>
        <group ref={turnRef}>
          <group ref={idleRef}>
            {props && mounted.includes("stand") && (
              <group ref={standRef} visible={false}>
                <Stand {...props} />
              </group>
            )}
            {props && mounted.includes("card") && (
              <group ref={cardRef} visible={false}>
                <Card {...props} />
              </group>
            )}
            {props && mounted.includes("sticker") && (
              <group ref={stickerRef} visible={false}>
                <Sticker {...props} />
              </group>
            )}
          </group>
        </group>
      </group>

      <ContactShadows position={[0, FLOOR_Y, 0]} scale={3.4} resolution={256} blur={2.2} far={1.2} opacity={0.72} color="#111214" />
    </>
  );
}

/* ------------------------------------------------------------------ fallback */
// Without WebGL (blocked, or the GPU refuses a context) the shop still shows the print itself, flat,
// so the owner sees their name on the product; the page around it never breaks.

class StageBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const FLAT_SHAPE: Record<ProductKind, string> = {
  stand: "h-[78%] rounded-[1.5%] shadow-[0_1px_2px_rgb(17_18_20/0.08),0_12px_32px_-12px_rgb(17_18_20/0.25)]",
  card: "w-[72%] rounded-[3.7%/5.9%] shadow-[0_1px_2px_rgb(17_18_20/0.1),0_16px_36px_-14px_rgb(17_18_20/0.4)]",
  sticker: "h-[62%] rounded-full shadow-[0_1px_2px_rgb(17_18_20/0.1),0_16px_36px_-14px_rgb(17_18_20/0.4)]",
};

function FlatPrint({ product, businessName, font }: { product: ProductKind; businessName: string; font: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && font) drawPrint(ref.current, product, businessName, font);
  }, [product, businessName, font]);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <canvas ref={ref} className={`max-h-[78%] max-w-[80%] ${FLAT_SHAPE[product]} ${font ? "" : "invisible"}`} />
    </div>
  );
}

/* ------------------------------------------------------------------ stage */

export default function ProductStage({ product, businessName, className = "" }: { product: ProductKind; businessName: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>({ active: false, id: -1, x: 0, y: 0, yaw: 0, pitch: 0, ry: 0, rx: 0, releasedAt: 0 });
  const kick = useRef<() => void>(() => {});
  const [onScreen, setOnScreen] = useState(true);
  const [slow, setSlow] = useState(false);
  const [light] = useState(detectLightDevice);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedOnServer);
  const font = useStageFont();
  const still = reduced || light;
  const lite = light || slow;

  // stop drawing altogether while the stage is scrolled out of view
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "160px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const d = drag.current;
    d.active = true;
    d.id = e.pointerId;
    d.x = e.clientX;
    d.y = e.clientY;
    d.yaw = d.ry; // pick the product up where it is, even mid-settle
    d.pitch = d.rx;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    kick.current();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    d.yaw = THREE.MathUtils.clamp(d.yaw + ((e.clientX - d.x) / Math.max(1, rect.width)) * Math.PI * 1.15, -2.6, 2.6);
    d.pitch = THREE.MathUtils.clamp(d.pitch + ((e.clientY - d.y) / Math.max(1, rect.height)) * Math.PI * 0.5, -0.3, 0.3);
    d.x = e.clientX;
    d.y = e.clientY;
    kick.current();
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (e.pointerId !== d.id) return;
    d.active = false;
    d.id = -1;
    d.releasedAt = nowS();
    e.currentTarget.style.cursor = "";
    kick.current();
  };

  const name = businessName.trim() || "your business name";

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={`${LABELS[product]} printed with ${name}, preview`}
      className={`relative h-full w-full cursor-grab touch-pan-y select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      <StageBoundary fallback={<FlatPrint product={product} businessName={businessName} font={font} />}>
        {/* the same placeholder the page showed while this code loaded, held until the scene has
            built and compiled, so the box never sits empty in between */}
        <div ref={skeletonRef} className="absolute inset-0">
          <ProductStageSkeleton />
        </div>
        <div ref={fadeRef} aria-hidden="true" className="absolute inset-0 opacity-0 will-change-[opacity]">
          <Canvas
            frameloop={onScreen ? "demand" : "never"}
            dpr={lite ? 1 : [1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping }}
            camera={{ fov: 30, near: 1, far: 20, position: [0, 0.5, 5.2] }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
              // only the acrylic's edges and base refract (the print is drawn crisp on top), so a
              // half-resolution refraction buffer is indistinguishable and a quarter of the cost
              gl.transmissionResolutionScale = 0.5;
            }}
          >
            <Scene
              product={product}
              businessName={businessName}
              font={font}
              still={still}
              lite={lite}
              active={onScreen}
              onSlow={() => setSlow(true)}
              fadeRef={fadeRef}
              skeletonRef={skeletonRef}
              dragRef={drag}
              kickRef={kick}
            />
          </Canvas>
        </div>
      </StageBoundary>
    </div>
  );
}
