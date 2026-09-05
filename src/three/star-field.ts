import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { StarFieldParams } from "@/debug/params";
import { createChromeMaterial } from "./chrome";

const MODEL_URL = "/models/star.glb";
const MAX_COUNT = 160;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StarFieldHandle {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
  setBounds: (box: THREE.Box3) => void;
  update: (
    elapsed: number,
    pointer: { x: number; y: number },
    camera: THREE.PerspectiveCamera,
    p: StarFieldParams
  ) => void;
  dispose: () => void;
}

export async function createStarField(): Promise<StarFieldHandle> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  gltf.scene.updateMatrixWorld(true);

  let source: THREE.Mesh | null = null;
  gltf.scene.traverse((object) => {
    if (!source && object instanceof THREE.Mesh) source = object;
  });
  if (!source) throw new Error("star.glb contains no mesh");

  /* Normalize */
  const geometry = (source as THREE.Mesh).geometry.clone();
  geometry.applyMatrix4((source as THREE.Mesh).matrixWorld);
  geometry.center();
  geometry.computeBoundingBox();
  const bounds0 = geometry.boundingBox as THREE.Box3;
  const size0 = bounds0.getSize(new THREE.Vector3());
  const maxDim = Math.max(size0.x, size0.y, size0.z) || 1;
  geometry.scale(1 / maxDim, 1 / maxDim, 1 / maxDim);

  const oldMaterial = (source as THREE.Mesh).material;
  for (const m of Array.isArray(oldMaterial) ? oldMaterial : [oldMaterial]) {
    m.dispose();
  }

  const material = createChromeMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, MAX_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;

  const base = new Float32Array(MAX_COUNT * 3);
  const scales = new Float32Array(MAX_COUNT);
  const phases = new Float32Array(MAX_COUNT);
  const bobSpeeds = new Float32Array(MAX_COUNT);
  const spinSpeeds = new Float32Array(MAX_COUNT);
  const twinkleSpeeds = new Float32Array(MAX_COUNT);

  let bounds: THREE.Box3 | null = null;
  let layoutCount = -1;
  let layoutHalfW = -1;
  let layoutHalfH = -1;

  const layout = (count: number, halfW: number, halfH: number) => {
    if (!bounds) return;
    layoutCount = count;
    layoutHalfW = halfW;
    layoutHalfH = halfH;
    const rng = mulberry32(0x5eed);
    const center = bounds.getCenter(new THREE.Vector3());
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);

    /* Shell */
    const rx = Math.min(half.x + 1.5, halfW * 0.85);
    const ry = Math.min(half.y + 1.4, halfH * 0.8);
    const rz = half.z + 1.2;

    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2;
      const z = rng() * 2 - 1;
      const ring = Math.sqrt(1 - z * z);
      const jitter = 0.85 + rng() * 0.35;
      base[i * 3] = center.x + ring * Math.cos(theta) * rx * jitter;
      base[i * 3 + 1] = center.y + z * ry * jitter;
      base[i * 3 + 2] = center.z + ring * Math.sin(theta) * rz * jitter;
      scales[i] = 0.6 + rng() * 0.8;
      phases[i] = rng() * Math.PI * 2;
      bobSpeeds[i] = 0.5 + rng();
      spinSpeeds[i] = (0.4 + rng() * 0.6) * (rng() > 0.5 ? 1 : -1);
      twinkleSpeeds[i] = 0.8 + rng() * 1.4;
    }
  };

  const dummy = new THREE.Object3D();
  const smoothed = { x: 0, y: 0 };

  const update = (
    elapsed: number,
    pointer: { x: number; y: number },
    camera: THREE.PerspectiveCamera,
    p: StarFieldParams
  ) => {
    if (!bounds) return;

    const halfH =
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const halfW = halfH * camera.aspect;

    const count = Math.min(Math.max(Math.round(p.count), 1), MAX_COUNT);
    if (count !== layoutCount || halfW !== layoutHalfW || halfH !== layoutHalfH) {
      layout(count, halfW, halfH);
    }
    mesh.count = count;

    /* Pointer */
    smoothed.x += (pointer.x - smoothed.x) * 0.08;
    smoothed.y += (pointer.y - smoothed.y) * 0.08;

    mesh.rotation.y = smoothed.x * p.parallax;
    mesh.rotation.x = -smoothed.y * p.parallax * 0.6;

    const cx = smoothed.x * halfW;
    const cy = smoothed.y * halfH;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];
      let x = base[i3];
      let y =
        base[i3 + 1] + Math.sin(elapsed * bobSpeeds[i] + phase) * p.bobAmount;
      let z = base[i3 + 2];

      /* Repel */
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy + z * z);
      if (dist < p.repelRadius && dist > 1e-4) {
        const falloff = 1 - dist / p.repelRadius;
        const push = (falloff * falloff * p.repelStrength) / dist;
        x += dx * push;
        y += dy * push;
        z += z * push;
      }

      dummy.position.set(x, y, z);
      dummy.rotation.set(
        Math.sin(elapsed * 0.5 + phase) * 0.35,
        elapsed * spinSpeeds[i] * p.spinSpeed + phase,
        0
      );
      const twinkle =
        1 + Math.sin(elapsed * twinkleSpeeds[i] + phase * 2) * 0.18;
      dummy.scale.setScalar(p.size * scales[i] * twinkle);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return {
    mesh,
    material,
    setBounds: (box) => {
      bounds = box.clone();
      layoutCount = -1;
    },
    update,
    dispose: () => {
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
