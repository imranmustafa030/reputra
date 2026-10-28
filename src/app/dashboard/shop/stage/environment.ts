import * as THREE from "three";

// A studio built from five glowing panels and baked once into a prefiltered environment map:
// a large softbox overhead, a tall strip on the left, a smaller one on the right, a long strip
// behind and a short one in front. No HDR files, nothing fetched, one PMREM pass at start-up.

const PANELS: { at: [number, number, number]; size: [number, number]; intensity: number }[] = [
  { at: [0, 5, 1.5], size: [9, 4], intensity: 2.4 },
  { at: [-5, 1.5, 1.5], size: [4, 6], intensity: 1.6 },
  { at: [5, 1, -1], size: [3, 5], intensity: 0.9 },
  { at: [0, 1.2, -6], size: [10, 2], intensity: 0.8 },
  { at: [2.5, 1.8, 6], size: [3, 1], intensity: 0.55 },
];

/** Bakes the studio and sets it as `scene.environment`. Returns a cleanup function. */
export function applyStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const studio = new THREE.Scene();
  const geo = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  for (const p of PANELS) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(p.intensity), side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...p.at);
    m.scale.set(p.size[0], p.size[1], 1);
    m.lookAt(0, 0, 0);
    studio.add(m);
    mats.push(mat);
  }
  const pmrem = new THREE.PMREMGenerator(gl);
  const target = pmrem.fromScene(studio, 0.02);
  pmrem.dispose();
  geo.dispose();
  mats.forEach((m) => m.dispose());
  scene.environment = target.texture;
  return () => {
    if (scene.environment === target.texture) scene.environment = null;
    target.dispose();
  };
}
