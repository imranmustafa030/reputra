import { useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { useThree } from "@react-three/fiber";
import { loadFont } from "@remotion/google-fonts/Geist";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AMBER, H, INK, MARK, W, buildCard } from "./card";

// "The tap", about two seconds. Four acts, after the motion-design brief:
//   1. Out of the dark (0–0.4s): only the card's gold edge catches the rim light as it drifts in.
//   2. The turn (0–0.9s): it swings to face us while the key light sweeps across it, so a glint
//      runs over the varnished engraving.
//   3. The tap (0.92–1.2s): a short push towards the camera, as against a phone, then a settle;
//      the foil mark flares and two fine rings of light break off it.
//   4. Into the mark (1.1–1.8s): the camera dives into the amber dot until it fills the frame,
//      then the frame is the brand's flat amber for the page to take over.
// The page takes over from that amber (the business name, then the stars).

const { fontFamily, waitUntilDone } = loadFont("normal", { weights: ["500", "600"], subsets: ["latin"] });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const SWING = Easing.bezier(0.33, 0, 0.12, 1); // a slow start and a long, controlled landing
const PUSH = Easing.bezier(0.5, 0, 0.75, 0); // accelerating into contact
const DIVE = Easing.bezier(0.45, 0, 0.75, 0.85); // eases off the hold, then commits to the dot

export type IntroProps = { vertical: boolean };

export const Intro: React.FC<IntroProps> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [ready] = useState(() => delayRender("fonts"));
  const [fontsReady, setFontsReady] = useState(false);
  useLayoutEffect(() => {
    waitUntilDone().then(() => {
      setFontsReady(true);
      continueRender(ready);
    });
  }, [ready]);

  const t = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* a real shutter: each frame averages ten moments of its half-frame exposure, so the
          swing and the dive blur the way a camera would record them */}
      {fontsReady && (
        <CameraMotionBlur shutterAngle={180} samples={10}>
          <Scene vertical={vertical} />
        </CameraMotionBlur>
      )}
      {/* lens: a gentle vignette, lifting as the camera arrives in the dot */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
          opacity: interpolate(t, [1.45, 1.75], [1, 0], clamp),
        }}
      />
      {/* the dot fills the frame and settles into the brand's flat amber, for the page to take over */}
      <AbsoluteFill style={{ backgroundColor: AMBER, opacity: interpolate(t, [1.66, 1.8], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* the backdrop: a warm pool of light behind the card, coming up as the key light does */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 70% 45% at 50% 47%, #24211b 0%, #15140f 38%, #0b0c0e 72%)",
          opacity: interpolate(t, [0.1, 0.9], [0, 1], { ...clamp, easing: OUT_EXPO }),
        }}
      />
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.98 }}
        camera={{ fov: 26, near: 0.02, far: 200, position: [0, 0, 30] }}
      >
        <Stage t={t} vertical={vertical} font={fontFamily} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const Stage: React.FC<{ t: number; vertical: boolean; font: string }> = ({ t, vertical, font }) => {
  const { gl, scene, camera, size } = useThree();
  const { card, foilMat, rings } = useMemo(() => buildCard(font), [font]);
  const holder = useMemo(() => {
    const g = new THREE.Group();
    g.add(card);
    return g;
  }, [card]);

  // a studio for nothing: a procedural room plus one softbox overhead, as on the website
  const lights = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const softMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    softMat.color.multiplyScalar(5);
    const soft = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), softMat);
    soft.position.set(0, 6.5, 5.5);
    soft.lookAt(0, 0, 0);
    room.add(soft);
    const env = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xfaf7f0, 1.5);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight(0xffe2b0, 2.4);
    rim.position.set(-3, 6, -7);
    return { env, key, rim };
  }, [gl]);
  scene.environment = lights.env;

  // ---- framing: the card upright in portrait (as it is held to a phone), flat in landscape
  const aspect = size.width / size.height;
  const tan = Math.tan(THREE.MathUtils.degToRad(13));
  const across = vertical ? H : W; // the card's width on screen
  const distance = across / 0.66 / (2 * tan * aspect); // the card spans two thirds of the width
  card.rotation.z = vertical ? Math.PI / 2 : 0;

  // ---- act 1 and 2: drift in from the dark and swing to face the camera
  const tap = interpolate(t, [0.92, 1.0, 1.22], [0, 0.8, 0.4], { ...clamp, easing: [PUSH, OUT_EXPO] });
  holder.position.set(0, 0, interpolate(t, [0, 0.9], [-16, 0], { ...clamp, easing: OUT_EXPO }) + tap);
  holder.rotation.set(
    interpolate(t, [0, 0.9, 1.25], [-0.34, 0.07, 0], { ...clamp, easing: [SWING, OUT_EXPO] }),
    interpolate(t, [0, 0.9, 1.25], [1.32, -0.1, 0], { ...clamp, easing: [SWING, OUT_EXPO] }),
    interpolate(t, [0, 0.9], [-0.09, 0], { ...clamp, easing: SWING }),
  );
  // the key light comes up and travels across the card as it turns: the glint runs over the bands
  lights.key.intensity = interpolate(t, [0, 0.6], [0.05, 1.8], { ...clamp, easing: OUT_EXPO });
  lights.key.position.set(interpolate(t, [0.1, 1.0], [-9, 6], { ...clamp, easing: SWING }), 6, 6);
  scene.environmentIntensity = interpolate(t, [0, 0.7], [0.12, 0.75], { ...clamp, easing: OUT_EXPO });

  // ---- act 3: the foil flares at contact, and the rings break off the mark
  foilMat.emissiveIntensity = interpolate(t, [0.94, 1.0, 1.4], [0.1, 1.4, 0.6], { ...clamp, easing: [PUSH, OUT_EXPO] });
  rings.forEach((ring, i) => {
    const start = 0.98 + i * 0.09;
    const p = interpolate(t, [start, start + 0.55], [0, 1], { ...clamp, easing: OUT_EXPO });
    const s = 1 + p * 2.6;
    ring.scale.set(s, s, 1);
    (ring.material as THREE.MeshBasicMaterial).opacity = t < start ? 0 : (1 - p) * (0.85 - i * 0.3);
  });

  // ---- act 4: the camera dives into the dot
  holder.updateMatrixWorld(true);
  const markWorld = new THREE.Vector3(MARK.x, MARK.y, 0.09).applyMatrix4(card.matrixWorld);
  // an exponential dolly: equal time, equal sense of zoom, ending inside the dot
  const dive = interpolate(t, [1.1, 1.78], [0, 1], { ...clamp, easing: DIVE });
  const start = new THREE.Vector3(interpolate(t, [0, 1.1], [0.5, 0], clamp), interpolate(t, [0, 1.1], [-0.35, 0], clamp), distance);
  const away = start.clone().sub(markWorld);
  const d0 = away.length();
  const d1 = 1.25; // the dot just overfills the frame here
  const d = d0 * Math.pow(d1 / d0, dive);
  const dir = away.normalize().lerp(new THREE.Vector3(0, 0, 1), dive).normalize();
  camera.position.copy(markWorld).addScaledVector(dir, d);
  const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), markWorld, Math.min(1, dive * 2.2));
  camera.lookAt(look);
  const lens = camera as THREE.PerspectiveCamera;
  lens.fov = 26 - dive * 8;
  // keep depth precision: the near plane follows the camera in, so the thin layers never fight
  lens.near = Math.max(0.01, d * 0.4);
  lens.far = d + 60;
  lens.updateProjectionMatrix();

  return (
    <>
      <primitive object={lights.key} />
      <primitive object={lights.rim} />
      <primitive object={holder} />
    </>
  );
};
